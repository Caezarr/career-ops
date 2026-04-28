// Resolve the portal root for primitives. We mount inside `.dashboard-root`
// so all design tokens (light-mode CSS vars) cascade naturally onto the
// portal subtree. Falls back to document.body if the dashboard root is
// not yet mounted (e.g. in tests).

export function resolvePortalRoot(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("Portal root requested in non-browser environment");
  }
  const root = document.querySelector<HTMLElement>(".dashboard-root");
  return root ?? document.body;
}
