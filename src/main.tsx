import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress specific react-pdf initialization log
const originalLog = console.log;
console.log = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('react-pdf')) return;
  originalLog(...args);
};

createRoot(document.getElementById("root")!).render(<App />);
