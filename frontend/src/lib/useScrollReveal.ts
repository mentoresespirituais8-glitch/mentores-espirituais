import { useEffect } from "react";

/** Adiciona "is-visible" a qualquer .reveal quando entra no viewport. */
export function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    // Sem IntersectionObserver (browsers antigos), revela tudo de imediato —
    // pior sem animação do que com secções invisíveis para sempre.
    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const elements = document.querySelectorAll(".reveal:not(.is-visible)");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      // threshold baixo + margem: dispara mal uma ponta da secção se aproxima
      // do viewport. Com threshold 0.15, secções altas em ecrãs pequenos (ou
      // scroll muito rápido) podiam nunca atingir os 15% visíveis e ficavam
      // invisíveis — visto a acontecer com a secção "Como funciona".
      { threshold: 0.01, rootMargin: "0px 0px 10% 0px" }
    );

    elements.forEach((el) => observer.observe(el));

    // Rede de segurança: se após uns segundos algo continuar por revelar
    // (observer que não disparou, edge case de layout), revela na mesma —
    // conteúdo invisível é sempre o pior resultado possível.
    const failsafe = window.setTimeout(() => {
      elements.forEach((el) => el.classList.add("is-visible"));
    }, 4000);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
