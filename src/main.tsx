import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./context/LanguageContext";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("Root element #app not found.");

ReactDOM.createRoot(root).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
