import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import WhosThatPlayermon from "./WhosThatPlayermon/index.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WhosThatPlayermon />
  </StrictMode>
);
