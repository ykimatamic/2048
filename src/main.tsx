import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { Game } from "./components/Game.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./styles/game.css";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Game />
    </ErrorBoundary>
  </StrictMode>,
);
