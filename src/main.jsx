import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App isMyBets={false} />} />
        <Route path="/mybets" element={<App isMyBets={true} />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
