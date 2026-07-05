import { useEffect, useState } from "react";

export type Tema = "dark" | "light";

const CHAVE_STORAGE = "quitado-theme";
const COR_THEME: Record<Tema, string> = { dark: "#0b1120", light: "#f2f4f8" };

function temaInicial(): Tema {
  const salvo = localStorage.getItem(CHAVE_STORAGE);
  if (salvo === "dark" || salvo === "light") return salvo;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COR_THEME[tema]);
    localStorage.setItem(CHAVE_STORAGE, tema);
  }, [tema]);

  function alternar() {
    setTema((t) => (t === "dark" ? "light" : "dark"));
  }

  return [tema, alternar];
}
