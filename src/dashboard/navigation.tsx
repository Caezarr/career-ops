import { createContext, useContext, useState, ReactNode } from "react";

export type Page = "dashboard" | "jobs" | "applications" | "cv" | "prep" | "copilot" | "settings";

interface NavCtx {
  page: Page;
  navigate: (p: Page) => void;
}

const NavigationContext = createContext<NavCtx | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>("dashboard");
  return (
    <NavigationContext.Provider value={{ page, navigate: setPage }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}
