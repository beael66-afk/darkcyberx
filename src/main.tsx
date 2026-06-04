import { createRoot } from "react-dom/client";
import "./index.css";

if (window.location.pathname === "/auth") {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      localStorage.removeItem(key);
    }
  });
}

void import("./App.tsx").then(({ default: App }) => {
  createRoot(document.getElementById("root")!).render(<App />);
});
