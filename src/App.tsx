import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  register,
  unregister,
} from "@tauri-apps/plugin-global-shortcut";

type Status = "idle" | "recording" | "thinking" | "ready" | "error";

interface Bullet {
  text: string;
  cite?: string | null;
  unverified?: boolean;
}

interface Config {
  anthropic_key: string;
  openai_key: string;
  cv: string;
  jd: string;
  persona: "finance" | "tech-ai" | "consulting";
  audio_device: string;
}

const DEFAULT_CONFIG: Config = {
  anthropic_key: "",
  openai_key: "",
  cv: "",
  jd: "",
  persona: "finance",
  audio_device: "",
};

// Reliable drag handler for Tauri 2 — works regardless of titleBarStyle / decorations.
async function startDrag(e: React.MouseEvent) {
  if (e.buttons !== 1) return; // primary button only
  // Don't drag from interactive children (buttons/inputs)
  const tag = (e.target as HTMLElement).tagName;
  if (["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A"].includes(tag)) return;
  try {
    await getCurrentWindow().startDragging();
  } catch (err) {
    console.warn("startDragging failed:", err);
  }
}

async function closeWindow() {
  try {
    await getCurrentWindow().close();
  } catch (err) {
    console.warn("close failed:", err);
  }
}

async function minimizeWindow() {
  try {
    await getCurrentWindow().minimize();
  } catch (err) {
    console.warn("minimize failed:", err);
  }
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(true);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [recordingTime, setRecordingTime] = useState(0);

  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ic-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
        if (parsed.anthropic_key) setShowConfig(false);
      } catch {
        // ignore
      }
    }
  }, []);

  const saveConfig = useCallback((next: Config) => {
    setConfig(next);
    localStorage.setItem("ic-config", JSON.stringify(next));
  }, []);

  useEffect(() => {
    const unlistenStatus = listen<Status>("status", (e) => {
      setStatus(e.payload);
      if (e.payload === "recording") {
        setRecordingTime(0);
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingTime((t) => t + 0.1);
        }, 100);
      } else if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    });

    const unlistenTranscript = listen<string>("transcript", (e) => {
      setTranscript(e.payload);
    });

    const unlistenBullets = listen<Bullet[]>("bullets", (e) => {
      setBullets(e.payload);
    });

    const unlistenError = listen<string>("error", (e) => {
      setError(e.payload);
      setStatus("error");
    });

    return () => {
      unlistenStatus.then((fn) => fn());
      unlistenTranscript.then((fn) => fn());
      unlistenBullets.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const shortcut = "CmdOrCtrl+Shift+Space";
    let mounted = true;

    register(shortcut, async () => {
      if (!mounted) return;
      await triggerCapture();
    }).catch((e) => {
      console.warn("Hotkey register failed:", e);
    });

    return () => {
      mounted = false;
      unregister(shortcut).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const triggerCapture = useCallback(async () => {
    if (!config.anthropic_key) {
      setError("Configure your Anthropic API key first");
      return;
    }
    setError(null);
    setBullets([]);
    setTranscript("");
    try {
      await invoke("start_capture", {
        config: {
          anthropicKey: config.anthropic_key,
          openaiKey: config.openai_key,
          cv: config.cv,
          jd: config.jd,
          persona: config.persona,
          durationSecs: 6,
          audioDevice: config.audio_device,
        },
      });
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }, [config]);

  const stopCapture = useCallback(async () => {
    try {
      await invoke("stop_capture");
    } catch (e) {
      console.warn(e);
    }
  }, []);

  return (
    <div className="app">
      <div className="header" onMouseDown={startDrag}>
        <div className="window-controls">
          <button
            className="wc wc-close"
            onClick={closeWindow}
            title="Close"
            aria-label="Close"
          >
            <svg viewBox="0 0 10 10" fill="none">
              <path
                d="M2 2 L8 8 M8 2 L2 8"
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="wc wc-min"
            onClick={minimizeWindow}
            title="Minimize"
            aria-label="Minimize"
          >
            <svg viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5 L8 5"
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <span className="title">
          Interview Copilot
          <span style={{ marginLeft: 8, opacity: 0.45 }}>
            <span className="kbd">⌘⇧Space</span> to capture
          </span>
        </span>
        <StatusPill status={status} time={recordingTime} />
      </div>

      {showConfig ? (
        <ConfigPanel
          config={config}
          onSave={saveConfig}
          onClose={() => setShowConfig(false)}
        />
      ) : (
        <>
          <div className="transcript">
            {transcript || "Waiting for question…"}
          </div>

          {bullets.length > 0 ? (
            <div className="bullets">
              {bullets.map((b, i) => (
                <div
                  key={i}
                  className={`bullet ${i === 0 ? "headline" : ""} ${
                    b.unverified ? "unverified" : ""
                  }`}
                >
                  <span className="bullet-num">{i + 1}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {status === "recording"
                ? "Listening…"
                : status === "thinking"
                  ? "Generating bullets…"
                  : status === "error"
                    ? "Error — check config"
                    : "Press ⌘⇧Space, ask a question, release after question."}
            </div>
          )}

          {error && <div className="error">{error}</div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn"
              onClick={triggerCapture}
              disabled={status === "recording" || status === "thinking"}
            >
              Capture
            </button>
            <button
              className="btn"
              onClick={stopCapture}
              disabled={status !== "recording"}
            >
              Stop
            </button>
            <button className="btn" onClick={() => setShowConfig(true)}>
              Config
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ status, time }: { status: Status; time: number }) {
  const label =
    status === "recording"
      ? `REC ${time.toFixed(1)}s`
      : status === "thinking"
        ? "THINKING"
        : status === "ready"
          ? "READY"
          : status === "error"
            ? "ERROR"
            : "IDLE";

  const cls =
    status === "recording"
      ? "recording"
      : status === "thinking"
        ? "thinking"
        : status === "ready"
          ? "ready"
          : "";

  return (
    <span className={`status-pill ${cls}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

function ConfigPanel({
  config,
  onSave,
  onClose,
}: {
  config: Config;
  onSave: (c: Config) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(config);
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [devices, setDevices] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<string[]>("list_audio_devices")
      .then((list) => {
        setDevices(list);
        // Auto-pick BlackHole if present and no device chosen yet
        if (!draft.audio_device) {
          const bh = list.find((d) => /blackhole/i.test(d));
          if (bh) setDraft((d) => ({ ...d, audio_device: bh }));
        }
      })
      .catch((e) => console.warn("list_audio_devices failed:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasBlackHole = devices.some((d) => /blackhole/i.test(d));

  const handlePdfUpload = useCallback(
    async (file: File) => {
      setPdfError(null);
      setPdfStatus(`Reading ${file.name}…`);
      try {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        // Encode in chunks to avoid stack overflow on large PDFs
        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(
            ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)),
          );
        }
        const b64 = btoa(binary);
        setPdfStatus("Parsing PDF…");
        const text = await invoke<string>("parse_cv_pdf", { b64 });
        setDraft((d) => ({ ...d, cv: text }));
        setPdfStatus(`Loaded ${file.name} (${text.length} chars)`);
      } catch (e) {
        setPdfStatus(null);
        setPdfError(typeof e === "string" ? e : String(e));
      }
    },
    [],
  );

  return (
    <div className="config">
      <label>
        Anthropic API key (Claude — bullets)
        <input
          type="password"
          placeholder="sk-ant-..."
          value={draft.anthropic_key}
          onChange={(e) =>
            setDraft({ ...draft, anthropic_key: e.target.value })
          }
        />
      </label>
      <label>
        OpenAI API key (Whisper — STT)
        <input
          type="password"
          placeholder="sk-..."
          value={draft.openai_key}
          onChange={(e) =>
            setDraft({ ...draft, openai_key: e.target.value })
          }
        />
      </label>
      <label>
        Audio source
        <select
          value={draft.audio_device}
          onChange={(e) =>
            setDraft({ ...draft, audio_device: e.target.value })
          }
          style={{
            background: "rgba(0,0,0,0.3)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 12,
          }}
        >
          <option value="">Default mic</option>
          {devices.map((d) => (
            <option key={d} value={d}>
              {d}
              {/blackhole/i.test(d) ? "  ← recommended for interviews" : ""}
            </option>
          ))}
        </select>
        {!hasBlackHole && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
            For interviews, install{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.open(
                  "https://github.com/ExistentialAudio/BlackHole",
                  "_blank",
                );
              }}
              style={{ color: "#95b8ff" }}
            >
              BlackHole
            </a>{" "}
            and route Zoom/Teams/Meet output to a Multi-Output Device that
            includes BlackHole. Then pick "BlackHole 2ch" here to capture the
            recruiter's voice.
          </span>
        )}
      </label>
      <label>
        Persona
        <select
          value={draft.persona}
          onChange={(e) =>
            setDraft({
              ...draft,
              persona: e.target.value as Config["persona"],
            })
          }
          style={{
            background: "rgba(0,0,0,0.3)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 12,
          }}
        >
          <option value="finance">Finance</option>
          <option value="tech-ai">Tech / AI</option>
          <option value="consulting">Stratégie / Conseil</option>
        </select>
      </label>
      <label>
        CV — upload PDF or paste text
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePdfUpload(f);
          }}
          style={{ marginBottom: 6 }}
        />
        {pdfStatus && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
            {pdfStatus}
          </span>
        )}
        {pdfError && (
          <span style={{ fontSize: 11, color: "#ff8b8b" }}>{pdfError}</span>
        )}
        <textarea
          placeholder="Paste your CV here, or upload a PDF above…"
          value={draft.cv}
          onChange={(e) => setDraft({ ...draft, cv: e.target.value })}
          rows={6}
        />
      </label>
      <label>
        Job description (paste raw text)
        <textarea
          placeholder="Paste the JD…"
          value={draft.jd}
          onChange={(e) => setDraft({ ...draft, jd: e.target.value })}
          rows={4}
        />
      </label>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          className="btn"
          disabled={!draft.anthropic_key}
          onClick={() => {
            onSave(draft);
            onClose();
          }}
        >
          Save & continue
        </button>
      </div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
        Stored locally in your browser. Move to Keychain in a later phase.
      </p>
    </div>
  );
}
