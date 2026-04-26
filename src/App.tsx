import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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
}

const DEFAULT_CONFIG: Config = {
  anthropic_key: "",
  openai_key: "",
  cv: "",
  jd: "",
  persona: "finance",
};

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(true);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [recordingTime, setRecordingTime] = useState(0);

  const recordingTimerRef = useRef<number | null>(null);

  // Load config from localStorage on mount
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

  // Persist config
  const saveConfig = useCallback(
    (next: Config) => {
      setConfig(next);
      localStorage.setItem("ic-config", JSON.stringify(next));
    },
    [],
  );

  // Listen to backend events
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

  // Register global hotkey Cmd+Shift+Space
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
      <div className="header">
        <span>
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
        CV (paste raw text or summary)
        <textarea
          placeholder="Paste your CV…"
          value={draft.cv}
          onChange={(e) => setDraft({ ...draft, cv: e.target.value })}
          rows={5}
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
