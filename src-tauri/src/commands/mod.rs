//! Sprint 6 (audit Backend HIGH — `lib.rs` partial split).
//!
//! Hosts Tauri command modules extracted out of `lib.rs`. Each
//! sub-module owns one domain. The `invoke_handler!` macro in `lib.rs`
//! still references commands by bare ident, so each sub-module's
//! contents are pulled into `lib.rs` via a glob `pub use`.

pub mod db;
