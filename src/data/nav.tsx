import { createContext, useContext, useEffect } from "react";

export interface NavGuardApi {
  register: (fn: (() => boolean) | null) => void;
}

export const NavGuardContext = createContext<NavGuardApi>({ register: () => {} });

/**
 * Registers a guard that returns true when navigation should be blocked
 * (e.g. a form has unsaved changes). Pass a stable function.
 */
export function useNavGuard(isDirty: () => boolean) {
  const { register } = useContext(NavGuardContext);
  useEffect(() => {
    register(isDirty);
    return () => register(null);
  }, [register, isDirty]);
}
