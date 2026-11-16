import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Root from "./Root";
import "./index.css";
import "./workspace.css";

const el = document.getElementById("root");
if (!el) throw new Error("Root element #root was not found");

createRoot(el).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
