import { useEffect, useState } from "react";

export default function useTheme(defaultTheme = "dark") {
  const [theme, setTheme] = useState(defaultTheme);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);
  return [theme, setTheme];
}
