import type { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

/** Simple CSS-based tooltip wrapper. 200ms fade in, default position above
 *  the trigger, with a small arrow pointing down. Implementation lives in
 *  styles/shared.css under the `.ds-tooltip` namespace. */
export default function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="ds-tooltip">
      {children}
      <span role="tooltip" className="ds-tooltip__bubble">
        {content}
      </span>
    </span>
  );
}
