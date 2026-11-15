import { useCallback, useEffect, useRef, useState } from "react";

export const ROUTES = ["menu", "record", "history", "settings"] as const;
export type RouteKey = (typeof ROUTES)[number];

function parseHash(): RouteKey {
  const h = window.location.hash.replace(/^#\/?/, "");
  return (ROUTES as readonly string[]).includes(h) ? (h as RouteKey) : "menu";
}

export function useRoute(beforeExternalNavigation?: (next: RouteKey) => boolean) {
  const [route, setRoute] = useState<RouteKey>(() => parseHash());

  const currentRoute = useRef(route);
  const externalGuard = useRef(beforeExternalNavigation);
  externalGuard.current = beforeExternalNavigation;
  useEffect(() => {
    const onHash = () => {
      const next = parseHash();
      if (next === currentRoute.current) return;
      if (externalGuard.current && !externalGuard.current(next)) {
        window.history.replaceState(null, "", `#/${currentRoute.current}`);
        return;
      }
      currentRoute.current = next;
      setRoute(next);
    };
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.location.replace("#/menu");
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((next: RouteKey) => {
    currentRoute.current = next;
    if (window.location.hash !== `#/${next}`) {
      window.location.hash = `#/${next}`;
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { route, navigate };
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

export function useEscape(handler: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handler, active]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
