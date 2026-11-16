"use client";
// Animazione "appare" allo scorrimento. Senza JavaScript (o con "riduci movimento") tutto resta visibile:
// la classe .s-js che nasconde gli elementi si aggiunge solo qui, dopo aver segnato quelli già in vista.
import { useEffect } from "react";

export function Rivela() {
  useEffect(() => {
    const radice = document.querySelector<HTMLElement>(".sito");
    if (!radice) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const elementi = Array.from(radice.querySelectorAll<HTMLElement>(".s-appare"));
    // quelli già nella schermata compaiono subito, senza lampeggiare
    for (const el of elementi) if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add("s-vista");
    radice.classList.add("s-js");
    const io = new IntersectionObserver(
      (voci) => {
        for (const v of voci) {
          if (v.isIntersecting) {
            v.target.classList.add("s-vista");
            io.unobserve(v.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    for (const el of elementi) if (!el.classList.contains("s-vista")) io.observe(el);
    return () => {
      io.disconnect();
      radice.classList.remove("s-js");
    };
  }, []);
  return null;
}
