import App from "./App";
import { LandingPage } from "./landing/LandingPage";
import { resolvePath, usePathname } from "./landing/router";

/**
 * Top-level route switch.
 *   /       → cinematic landing page
 *   /demo   → the existing FoodWise application
 * The demo bundle is a normal import so /demo works on direct load or refresh.
 */
export default function Root() {
  const path = usePathname();
  return resolvePath(path) === "demo" ? <App /> : <LandingPage />;
}
