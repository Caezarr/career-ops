import { COLORS, FONT } from "../lib/theme.ts";

/**
 * Bottom-left brand tag. Stays out of TikTok's UI safe zones (the
 * caption + right-hand action stack eat the bottom-right + right
 * 200px). Bottom-left is the only consistently-readable corner.
 *
 * Discreet by design — never larger than 28pt. The hook + body do
 * the work; the tag just makes sure a paused frame still says "this
 * is Career OS".
 */
export const BrandTag: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 96,
        left: 64,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 20px",
        background: "rgba(20, 22, 29, 0.62)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 999,
        fontFamily: FONT.family,
        fontSize: 26,
        fontWeight: 600,
        color: COLORS.text2,
        letterSpacing: "-0.01em",
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          display: "grid",
          placeItems: "center",
          background: COLORS.bgElev,
          border: `1px solid ${COLORS.borderStrong}`,
          borderRadius: 6,
          color: COLORS.accent2,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 3 L13 3 L13 6 L6.5 6 L6.5 7.5 L11.5 7.5 L11.5 10.5 L6.5 10.5 L6.5 13 L3 13 Z"
            fill="currentColor"
          />
        </svg>
      </span>
      Career OS
      <span style={{ color: COLORS.text3, fontWeight: 500 }}>· beta</span>
    </div>
  );
};
