// src/frontend/main.jsx
import App from "./app.jsx";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";


import { AuthProvider } from "./app/providers/AuthProvider.jsx";

// Tailwind direkt relativ laden (sicher, alias-unabhängig)
import "./styles/index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error(
    'Root-Element "#root" nicht gefunden. In src/frontend/index.html muss <div id="root"></div> existieren.'
  );
}

createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
