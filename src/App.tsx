import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

type Status = "idle" | "recording" | "thinking" | "ready" | "error" | "listening";


interface Config {
  anthropic_key: string;
  openai_key: string;
  cv: string;
  jd: string;
  persona: "finance" | "tech-ai" | "consulting";
  audio_device: string;
  loopback_device: string;
  model: string;
  assemblyai_key: string;
}

const DEFAULT_CONFIG: Config = {
  anthropic_key: "",
  openai_key: "",
  cv: "",
  jd: "",
  persona: "finance",
  audio_device: "",
  loopback_device: "",
  model: "",
  assemblyai_key: "",
};

// ── Window height constants (px) ─────────────────────────────────────────────
const H_HEADER   = 52;
const H_TRANS    = 56;
const H_BULLET   = 68;
const H_DOT_ANIM = 52;
const H_ERROR    = 40;
const H_PAD      = 14;
const H_CONFIG   = 530;
const H_MIN      = H_HEADER + H_DOT_ANIM + H_PAD;

async function startDrag(e: React.MouseEvent) {
  if (e.buttons !== 1) return;
  const tag = (e.target as HTMLElement).tagName;
  if (["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A"].includes(tag)) return;
  try { await getCurrentWindow().startDragging(); } catch {}
}

export default function App() {
  const [status, setStatus]             = useState<Status>("idle");
  const [transcript, setTranscript]     = useState("");
  const [answer, setAnswer]             = useState("");
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [showConfig, setShowConfig]     = useState(true);
  const [config, setConfig]             = useState<Config>(DEFAULT_CONFIG);
  const [recordingTime, setRecordingTime] = useState(0);
  const [collapsed, setCollapsed]       = useState(false);
  const [appMode, setAppMode]           = useState<"qa" | "pitch">("qa");
  const timerRef = useRef<number | null>(null);

  // ── Persist config ──────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("ic-config");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setConfig({ ...DEFAULT_CONFIG, ...p });
        if (p.anthropic_key) setShowConfig(false);
      } catch {}
    }
  }, []);

  const saveConfig = useCallback((next: Config) => {
    setConfig(next);
    localStorage.setItem("ic-config", JSON.stringify(next));
  }, []);

  // ── Event listeners ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ulStatus = listen<Status>("status", (e) => {
      setStatus(e.payload);
      if (e.payload === "recording") {
        setRecordingTime(0);
        timerRef.current = window.setInterval(
          () => setRecordingTime((t) => t + 0.1), 100
        );
      } else if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    // Clear answer when a new question starts transcribing
    const ulTranscript = listen<string>("transcript", (e) => {
      setTranscript(e.payload);
      setAnswer("");
    });

    // Stream answer tokens as they arrive from Haiku
    const ulAnswer = listen<string>("answer-token", (e) => {
      setAnswer((prev) => prev + e.payload);
    });

    const ulError = listen<string>("error", (e) => {
      setError(e.payload);
      setStatus("error");
    });

    return () => {
      ulStatus.then((f) => f());
      ulTranscript.then((f) => f());
      ulAnswer.then((f) => f());
      ulError.then((f) => f());
    };
  }, []);

  // Auto-expand when a new question begins processing
  useEffect(() => {
    if (["thinking", "recording", "error"].includes(status)) setCollapsed(false);
  }, [status]);

  // ── Hotkey ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const sc = "CmdOrCtrl+Shift+Space";
    let alive = true;
    register(sc, async () => { if (alive) await toggleSession(); }).catch(() => {});
    return () => { alive = false; unregister(sc).catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const sessionActive = ["listening", "recording", "thinking"].includes(status);
  const hasContent    = !!answer || !!error || ["thinking","recording"].includes(status) || !!transcript;
  const expanded      = !collapsed && (showConfig || hasContent);

  // ── Auto-resize window ──────────────────────────────────────────────────────
  useEffect(() => {
    let h: number;
    if (showConfig) {
      h = H_CONFIG;
    } else if (!expanded) {
      h = H_HEADER;
    } else {
      h = H_HEADER;
      if (transcript || ["thinking", "recording"].includes(status)) h += H_TRANS;
      if (answer) {
        const lines = Math.max(3, Math.ceil(answer.length / 58));
        h += Math.min(lines * 20 + 32, 240);
      } else if (["thinking", "recording", "listening"].includes(status)) {
        h += H_DOT_ANIM;
      }
      if (error) h += H_ERROR;
      h += H_PAD;
      h = Math.max(H_MIN, Math.min(620, h));
    }
    getCurrentWindow().setSize(new LogicalSize(460, h)).catch(() => {});
  }, [showConfig, expanded, answer, !!transcript, status, !!error]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const invokeCfg = useCallback(
    (cmd: string, extra?: object) =>
      invoke(cmd, {
        config: {
          anthropicKey: config.anthropic_key,
          openaiKey: config.openai_key,
          cv: config.cv,
          jd: config.jd,
          persona: config.persona,
          durationSecs: 6,
          audioDevice: config.audio_device,
          loopbackDevice: config.loopback_device,
          model: config.model,
          assemblyaiKey: config.assemblyai_key,
          appMode: appMode,
          ...extra,
        },
      }),
    [config, appMode]
  );

  const triggerCapture = useCallback(async () => {
    if (!config.anthropic_key) { setError("Configure your Anthropic API key first"); return; }
    setError(null); setAnswer(""); setTranscript("");
    try { await invokeCfg("start_capture"); }
    catch (e) { setError(String(e)); setStatus("error"); }
  }, [config, invokeCfg]);

  const startSession = useCallback(async () => {
    if (!config.anthropic_key) { setError("Configure your Anthropic API key first"); return; }
    setError(null); setAnswer(""); setTranscript("");
    try {
      await invokeCfg("start_session");
      setStatus("listening");
    } catch (e) { setError(String(e)); setStatus("error"); }
  }, [config, invokeCfg]);

  const stopSession = useCallback(async () => {
    try { await invoke("stop_session"); setStatus("idle"); } catch {}
  }, []);

  const toggleSession = useCallback(async () => {
    if (sessionActive) await stopSession(); else await startSession();
  }, [sessionActive, startSession, stopSession]);

  const generatePitch = useCallback(async () => {
    if (!config.anthropic_key) { setError("Configure your Anthropic API key first"); return; }
    setError(null); setAnswer(""); setTranscript("");
    try { await invokeCfg("generate_pitch", { instructions: "" }); }
    catch (e) { setError(String(e)); setStatus("error"); }
  }, [config, invokeCfg]);

  const copyAnswer = useCallback(async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 1500);
    } catch {}
  }, [answer]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* ── Header — always-visible drag pill ── */}
      <div className="header" onMouseDown={startDrag}>
        <div className="window-controls">
          <button className="wc wc-close" onClick={() => getCurrentWindow().close()}
            title="Close" aria-label="Close">
            <svg viewBox="0 0 10 10" fill="none">
              <path d="M2 2 L8 8 M8 2 L2 8" stroke="rgba(0,0,0,0.6)"
                strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="wc wc-min" onClick={() => getCurrentWindow().minimize()}
            title="Minimize" aria-label="Minimize">
            <svg viewBox="0 0 10 10" fill="none">
              <path d="M2 5 L8 5" stroke="rgba(0,0,0,0.6)"
                strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <span className="title">Interview Copilot</span>
        <StatusPill status={status} time={recordingTime} />

        {!showConfig && (
          <div className="header-actions">
            {/* Mode toggle */}
            <button
              className={`hbtn hbtn-mode ${appMode === "qa" ? "hbtn-mode-active" : ""}`}
              onClick={() => setAppMode("qa")}
              disabled={sessionActive}
              title="Q&A mode — answer interview questions">
              Q&A
            </button>
            <button
              className={`hbtn hbtn-mode ${appMode === "pitch" ? "hbtn-mode-active" : ""}`}
              onClick={() => setAppMode("pitch")}
              disabled={sessionActive}
              title="Pitch mode — structured self-presentation">
              Pitch
            </button>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />
            <button className="hbtn hbtn-pitch" onClick={generatePitch}
              disabled={sessionActive || status === "thinking"}
              title="Generate 3-min pitch now (Pyramid · STAR · MECE)">🎯</button>
            {!sessionActive
              ? <button className="hbtn hbtn-start" onClick={startSession}
                  title="Start session  ⌘⇧Space">▶</button>
              : <button className="hbtn hbtn-stop" onClick={stopSession}
                  title="Stop session  ⌘⇧Space">■</button>
            }
            {hasContent && (
              <button className="hbtn" onClick={() => setCollapsed((c) => !c)}
                title={collapsed ? "Expand" : "Collapse"}>
                {collapsed ? "▼" : "▲"}
              </button>
            )}
            <button className="hbtn" onClick={() => { setShowConfig(true); setCollapsed(false); }}
              title="Settings">⚙</button>
          </div>
        )}
      </div>

      {/* ── Config panel ── */}
      {showConfig && (
        <ConfigPanel config={config} onSave={saveConfig}
          onClose={() => setShowConfig(false)} />
      )}

      {/* ── Main content — visible when expanded ── */}
      {!showConfig && expanded && (
        <div className="content">

          {/* Transcript */}
          {(transcript || ["thinking", "recording"].includes(status)) && (
            <div className="transcript">
              {transcript ? (
                <>
                  <span className="transcript-label">🎙 Whisper heard</span>
                  <span className="transcript-text">{transcript}</span>
                </>
              ) : (
                <span className="transcript-text muted">
                  {status === "thinking" ? "Transcribing…" : "Capturing…"}
                </span>
              )}
            </div>
          )}

          {/* Streaming prose answer */}
          {answer ? (
            <div className="answer" onClick={copyAnswer} title="Click to copy">
              <span className="answer-text">
                <AnswerText text={answer} />
                {status === "thinking" && <span className="answer-cursor" />}
              </span>
              <span className="answer-copy-icon">
                {copiedAnswer ? "✓" : "⎘"}
              </span>
            </div>
          ) : (
            ["thinking", "recording", "listening"].includes(status) && (
              <div className="generating">
                <span className="gdot"/>
                <span className="gdot"/>
                <span className="gdot"/>
              </div>
            )
          )}

          {error && <div className="error">{error}</div>}

          {/* Subtle single-shot button for testing */}
          <div className="action-bar">
            <button className="btn btn-ghost btn-xs" onClick={triggerCapture}
              disabled={sessionActive} title="One-shot 6s capture">
              Single shot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AnswerText — renders [X:XX-X:XX] pitch markers with visual styling ────────
const TS_RE = /(\[\d+:\d{2}[-–]\d+:\d{2}\])/g;

function AnswerText({ text }: { text: string }) {
  const parts = text.split(TS_RE);
  return (
    <>
      {parts.map((part, i) =>
        TS_RE.test(part) ? (
          <span key={i} className="answer-ts">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ── StatusPill ────────────────────────────────────────────────────────────────
function StatusPill({ status, time }: { status: Status; time: number }) {
  const label =
    status === "listening" ? "LISTENING"
    : status === "recording" ? `REC ${time.toFixed(1)}s`
    : status === "thinking"  ? "THINKING"
    : status === "ready"     ? "READY"
    : status === "error"     ? "ERROR"
    : "IDLE";

  const cls =
    status === "listening" || status === "recording" ? "recording"
    : status === "thinking" ? "thinking"
    : status === "ready"    ? "ready"
    : "";

  return (
    <span className={`status-pill ${cls}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

// ── ConfigPanel ───────────────────────────────────────────────────────────────
function ConfigPanel({
  config, onSave, onClose,
}: { config: Config; onSave: (c: Config) => void; onClose: () => void }) {
  const [draft, setDraft]           = useState(config);
  const [pdfStatus, setPdfStatus]   = useState<string | null>(null);
  const [pdfError, setPdfError]     = useState<string | null>(null);
  const [devices, setDevices]       = useState<string[]>([]);
  const [models, setModels]         = useState<string[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<string[]>("list_audio_devices")
      .then((list) => {
        setDevices(list);
        if (!draft.loopback_device) {
          const bh = list.find((d) => /blackhole/i.test(d));
          if (bh) setDraft((d) => ({ ...d, loopback_device: bh }));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sel: React.CSSProperties = {
    background: "rgba(0,0,0,0.3)", color: "white",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
    padding: "6px 8px", fontSize: 12,
  };

  const handlePdf = useCallback(async (file: File) => {
    setPdfError(null); setPdfStatus(`Reading ${file.name}…`);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000)
        bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
      setPdfStatus("Parsing PDF…");
      const text = await invoke<string>("parse_cv_pdf", { b64: btoa(bin) });
      setDraft((d) => ({ ...d, cv: text }));
      setPdfStatus(`Loaded ${file.name} (${text.length} chars)`);
    } catch (e) { setPdfStatus(null); setPdfError(String(e)); }
  }, []);

  const detectModels = useCallback(async () => {
    if (!draft.anthropic_key) return;
    setModelLoading(true); setModelError(null);
    try {
      const list = await invoke<string[]>("list_anthropic_models", { key: draft.anthropic_key });
      setModels(list);
      // Auto-select first haiku-like model, else first available
      const haiku = list.find((m) => /haiku/i.test(m));
      setDraft((d) => ({ ...d, model: haiku ?? list[0] ?? d.model }));
    } catch (e) { setModelError(String(e)); }
    finally { setModelLoading(false); }
  }, [draft.anthropic_key]);

  const hasBlackHole = devices.some((d) => /blackhole/i.test(d));

  return (
    <div className="config">
      <label>
        Anthropic API key (Claude)
        <input type="password" placeholder="sk-ant-…" value={draft.anthropic_key}
          onChange={(e) => setDraft({ ...draft, anthropic_key: e.target.value })}/>
      </label>
      <label>
        AssemblyAI key — real-time STT (session mode)
        <input type="password" placeholder="…" value={draft.assemblyai_key}
          onChange={(e) => setDraft({ ...draft, assemblyai_key: e.target.value })}/>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
          Get a free key at assemblyai.com — needed for live session mode
        </span>
      </label>
      <label>
        Claude model
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {models.length > 0 ? (
            <select value={draft.model} style={{ ...sel, flex: 1 }}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input type="text" placeholder="detect →" value={draft.model} style={{ flex: 1 }}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}/>
          )}
          <button className="btn btn-ghost btn-xs"
            onClick={detectModels} disabled={!draft.anthropic_key || modelLoading}
            style={{ flexShrink: 0 }}>
            {modelLoading ? "…" : "Detect"}
          </button>
        </div>
        {modelError && <span style={{ fontSize: 10, color: "#ff8b8b" }}>{modelError}</span>}
      </label>
      <label>
        OpenAI API key (Whisper STT)
        <input type="password" placeholder="sk-…" value={draft.openai_key}
          onChange={(e) => setDraft({ ...draft, openai_key: e.target.value })}/>
      </label>
      <label>
        Mic — your voice
        <select value={draft.audio_device} style={sel}
          onChange={(e) => setDraft({ ...draft, audio_device: e.target.value })}>
          <option value="">Default mic (system)</option>
          {devices.filter((d) => !/blackhole/i.test(d)).map((d) =>
            <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <label>
        Loopback — recruiter audio
        <select value={draft.loopback_device} style={sel}
          onChange={(e) => setDraft({ ...draft, loopback_device: e.target.value })}>
          <option value="">Off — mic only</option>
          {devices.map((d) =>
            <option key={d} value={d}>{d}{/blackhole/i.test(d) ? " ← recommended" : ""}</option>)}
        </select>
        {!hasBlackHole && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
            Install{" "}
            <a href="#" style={{ color: "#95b8ff" }}
              onClick={(e) => { e.preventDefault();
                window.open("https://github.com/ExistentialAudio/BlackHole", "_blank"); }}>
              BlackHole
            </a>
            {" "}to capture recruiter audio.
          </span>
        )}
      </label>
      <label>
        Persona
        <select value={draft.persona} style={sel}
          onChange={(e) => setDraft({ ...draft, persona: e.target.value as Config["persona"] })}>
          <option value="finance">Finance / PE / IB</option>
          <option value="tech-ai">Tech / AI Engineering</option>
          <option value="consulting">Stratégie / Consulting</option>
        </select>
      </label>
      <label>
        CV — PDF ou texte
        <input ref={fileRef} type="file" accept="application/pdf,.pdf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdf(f); }}
          style={{ marginBottom: 6 }}/>
        {pdfStatus && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{pdfStatus}</span>}
        {pdfError  && <span style={{ fontSize: 11, color: "#ff8b8b" }}>{pdfError}</span>}
        <textarea placeholder="Colle ton CV ici, ou upload un PDF ci-dessus…"
          value={draft.cv} rows={6}
          onChange={(e) => setDraft({ ...draft, cv: e.target.value })}/>
      </label>
      <label>
        Job description
        <textarea placeholder="Colle la JD…" value={draft.jd} rows={4}
          onChange={(e) => setDraft({ ...draft, jd: e.target.value })}/>
      </label>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn btn-primary" disabled={!draft.anthropic_key}
          onClick={() => { onSave(draft); onClose(); }}>
          Save &amp; continue
        </button>
      </div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
        Stored locally in WebView. Keychain migration planned.
      </p>
    </div>
  );
}
