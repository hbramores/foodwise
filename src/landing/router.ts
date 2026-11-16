import { useEffect, useState } from "react";

export const LANDING_PATH = "/";
export const DEMO_PATH = "/demo";

/** Normalises a pathname to a known route. */
export function resolvePath(pathname: string): "landing" | "demo" {
  return pathname.startsWith(DEMO_PATH) ? "demo" : "landing";
}

export function usePathname(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

/** SPA navigation that keeps browser back/forward working. */
export function navigate(path: string) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
