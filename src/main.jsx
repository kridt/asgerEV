import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App isMyBets={false} />} />
        <Route path="/mybets" element={<App isMyBets={true} />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
