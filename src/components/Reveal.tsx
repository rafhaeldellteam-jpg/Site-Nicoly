"use client";

import { useEffect } from "react";

export default function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal:not(.active)");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("active");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -70px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });

  return null;
}
