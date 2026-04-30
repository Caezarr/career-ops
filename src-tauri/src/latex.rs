//! LaTeX → PDF compilation, with multiple backends.
//!
//! Two compilers are exposed behind a common trait so the caller can pick
//! the one that's available on the host:
//!
//!  * `PdflatexCompiler` — shells out to a system `pdflatex` (MacTeX / TeX
//!    Live). Fast, mature, but requires the user to install MacTeX.
//!  * `TectonicCompiler` — stub today, will embed the `tectonic` crate so
//!    no system dependency is needed (~50 MB added to the bundle).
//!
//! Use `pick_compiler()` to get the best available backend at runtime.

use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::fs;
use tokio::process::Command;
use uuid::Uuid;

/// Common interface for any LaTeX → PDF backend.
#[async_trait::async_trait]
pub trait LatexCompiler: Send + Sync {
    /// Compile `source` to a PDF file written under `output_dir`.
    /// Returns the absolute path of the generated PDF.
    async fn compile(&self, source: &str, output_dir: &Path) -> Result<PathBuf>;

    /// Human-readable name shown in the UI / logs.
    fn name(&self) -> &'static str;

    /// Quick check that this backend is usable on the host. Cheap; does
    /// not actually compile anything.
    async fn is_available(&self) -> bool;
}

// ── Backend 1: shell out to system pdflatex (MacTeX / TeX Live) ──────────────

pub struct PdflatexCompiler {
    /// Resolved binary path. None means we'll search at compile time.
    binary: Option<PathBuf>,
}

impl Default for PdflatexCompiler {
    fn default() -> Self {
        Self { binary: detect_pdflatex_sync() }
    }
}

/// Try the macOS-canonical MacTeX path first, then PATH. Synchronous so we
/// can use it in `Default::default()`. Returns None if nothing's found.
fn detect_pdflatex_sync() -> Option<PathBuf> {
    let mac_tex = PathBuf::from("/Library/TeX/texbin/pdflatex");
    if mac_tex.is_file() {
        return Some(mac_tex);
    }
    // PATH lookup.
    if let Ok(path) = std::env::var("PATH") {
        for dir in path.split(':') {
            let candidate = Path::new(dir).join("pdflatex");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

#[async_trait::async_trait]
impl LatexCompiler for PdflatexCompiler {
    fn name(&self) -> &'static str {
        "pdflatex (MacTeX)"
    }

    async fn is_available(&self) -> bool {
        self.binary.is_some()
    }

    async fn compile(&self, source: &str, output_dir: &Path) -> Result<PathBuf> {
        let binary = self
            .binary
            .as_ref()
            .ok_or_else(|| anyhow!("pdflatex not found — install MacTeX or BasicTeX first"))?;

        fs::create_dir_all(output_dir).await?;

        // Job-specific tempdir under the output dir so concurrent runs
        // don't clobber each other's .aux/.log/.out.
        let job_id = Uuid::new_v4();
        let job_dir = output_dir.join(format!("job-{job_id}"));
        fs::create_dir_all(&job_dir).await?;

        let tex_path = job_dir.join("cv.tex");
        fs::write(&tex_path, source.as_bytes())
            .await
            .context("write .tex source")?;

        // Two passes for hyperref bookmarks. First pass tolerates errors,
        // second one is authoritative.
        for pass in 1..=2 {
            let status = Command::new(binary)
                .arg("-interaction=nonstopmode")
                .arg("-halt-on-error")
                .arg(format!("-output-directory={}", job_dir.display()))
                .arg(&tex_path)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .await
                .with_context(|| format!("run pdflatex pass {pass}"))?;

            if !status.success() && pass == 2 {
                // Second pass failed → grab the log so the UI can show what's wrong.
                let log_path = job_dir.join("cv.log");
                let log_tail = match fs::read_to_string(&log_path).await {
                    Ok(s) => s.lines().rev().take(40).collect::<Vec<_>>().join("\n"),
                    Err(_) => "(no .log file produced)".to_string(),
                };
                return Err(anyhow!("pdflatex compilation failed:\n{log_tail}"));
            }
        }

        let generated = job_dir.join("cv.pdf");
        if !generated.is_file() {
            return Err(anyhow!("pdflatex finished without producing cv.pdf"));
        }

        // Move to a stable output path so the caller can keep it.
        let final_path = output_dir.join(format!("{job_id}.pdf"));
        fs::rename(&generated, &final_path)
            .await
            .context("move PDF to final path")?;

        // Best-effort cleanup of aux files.
        let _ = fs::remove_dir_all(&job_dir).await;

        Ok(final_path)
    }
}

// ── Backend 2: embedded Tectonic (TODO — Sprint 4) ───────────────────────────

/// Tectonic-based compiler. Currently a stub: the crate has heavy native
/// dependencies (HarfBuzz, ICU, libpng, freetype) and a ~10 minute first-build,
/// so we keep it optional and ship the pdflatex backend by default.
///
/// To enable later:
///   1. Add `tectonic = { version = "0.15", default-features = false,
///      features = ["geturl-curl", "external-harfbuzz"] }` to Cargo.toml
///   2. Replace the body of `compile` with `tectonic::latex_to_pdf(source)`
///      and write the returned bytes to disk.
///   3. Flip `is_available()` to true once the build is wired.
pub struct TectonicCompiler;

#[async_trait::async_trait]
impl LatexCompiler for TectonicCompiler {
    fn name(&self) -> &'static str {
        "tectonic (embedded)"
    }

    async fn is_available(&self) -> bool {
        // TODO: Sprint 4 — flip to true once the tectonic crate is wired.
        false
    }

    async fn compile(&self, _source: &str, _output_dir: &Path) -> Result<PathBuf> {
        Err(anyhow!(
            "Tectonic backend not yet integrated. Falling back to pdflatex."
        ))
    }
}

// ── Picker ───────────────────────────────────────────────────────────────────

/// Returns the best available compiler. Order of preference:
///   1. Tectonic (embedded — zero user setup, when wired in Sprint 4)
///   2. pdflatex (system — works today if MacTeX is installed)
pub async fn pick_compiler() -> Result<Box<dyn LatexCompiler>> {
    let tectonic = TectonicCompiler;
    if tectonic.is_available().await {
        return Ok(Box::new(tectonic));
    }

    let pdflatex = PdflatexCompiler::default();
    if pdflatex.is_available().await {
        return Ok(Box::new(pdflatex));
    }

    Err(anyhow!(
        "No LaTeX compiler available. Install MacTeX (https://www.tug.org/mactex) \
         and restart the app to enable CV optimization."
    ))
}

/// Public summary of available backends — surfaced to the UI in Settings.
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerAvailability {
    pub pdflatex: bool,
    pub tectonic: bool,
    pub recommended: Option<&'static str>,
}

pub async fn detect_compilers() -> CompilerAvailability {
    let pdflatex = PdflatexCompiler::default().is_available().await;
    let tectonic = TectonicCompiler.is_available().await;
    let recommended = if tectonic {
        Some("tectonic")
    } else if pdflatex {
        Some("pdflatex")
    } else {
        None
    };
    CompilerAvailability { pdflatex, tectonic, recommended }
}
