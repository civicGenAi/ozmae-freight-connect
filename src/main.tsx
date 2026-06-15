import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Global console security: Disable all logging in production environments
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  // Keep console.error for critical crash reports, or suppress it too if strictly required:
  // console.error = () => {}; 
} else {
  // Suppress specific react-pdf/PDF.js initialization logs for a cleaner dev console
  const originalLog = console.log;
  console.log = (...args) => {
    if (typeof args[0] === 'string' && (args[0].includes('react-pdf') || args[0].startsWith('PDF '))) return;
    originalLog(...args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
