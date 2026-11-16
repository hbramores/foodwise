import App from "./App";
import { LandingPage } from "./landing/LandingPage";
import { navigate, resolvePath, usePathname } from "./landing/router";
import { INTRO_KEY, markVisited } from "./landing/hooks";

/**
 * Top-level route switch.
 *   /       → cinematic landing page
 *   /demo   → the existing FoodWise application
 * The demo bundle is a normal import so /demo works on direct load or refresh.
 */
export default function Root() {
  const path = usePathname();

  if (resolvePath(path) === "demo") {
    return (
      <App
        onLogout={() => {
          // Leave the app for the public landing page. The intro is not replayed.
          markVisited(INTRO_KEY);
          navigate("/");
        }}
      />
    );
  }

  return <LandingPage />;
}
