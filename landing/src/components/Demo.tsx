/**
 * Demo block — frame mocked as a macOS window. Renders a placeholder
 * until you drop in the real screen recording.
 *
 * To swap in the real demo:
 *
 *   1. Record a 12-second loop with QuickTime (Cmd+Shift+5 → Record
 *      Selected Portion). Aim for 1920×1200 to match the 16:10 frame.
 *   2. Convert to a small loop with ffmpeg:
 *        ffmpeg -i in.mov -vf "scale=1080:-2" -an -movflags +faststart \
 *               -c:v libx264 -preset slow -crf 22 demo.mp4
 *   3. Drop demo.mp4 into landing/public/.
 *   4. Set VITE_DEMO_VIDEO_URL=/demo.mp4 in landing/.env.local
 *      (or just hardcode below — the env path is just for swappability).
 *
 * The placeholder shows the user the slot is a real video target, not a
 * static image. Better than a stock illustration that ages badly.
 */

const DEMO_URL = import.meta.env.VITE_DEMO_VIDEO_URL as string | undefined;

export default function Demo() {
  return (
    <section className="demo">
      <div className="container">
        <div className="demo__frame">
          <div className="demo__chrome" aria-hidden>
            <span className="demo__dot" />
            <span className="demo__dot" />
            <span className="demo__dot" />
            <span className="demo__title">Career OS — Dashboard</span>
          </div>
          <div className="demo__body">
            {DEMO_URL ? (
              <video
                className="demo__video"
                src={DEMO_URL}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="demo__placeholder">
                <p>Screen recording loop · 12s · 16:10</p>
                <code>landing/public/demo.mp4</code>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
