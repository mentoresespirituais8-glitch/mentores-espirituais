import { useEffect, useRef } from "react";

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i * 0.9) % 12}s`,
  duration: `${10 + (i % 5) * 2.4}s`,
  size: 2 + (i % 3),
}));

/**
 * Fundo ambiente fixo, partilhado por toda a página (não só pelo Hero) —
 * fica atrás de todas as secções e cartões, que têm o seu próprio fundo opaco.
 */
export default function SiteBackground() {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    function onScroll() {
      if (!parallaxRef.current) return;
      const offset = Math.min(window.scrollY * 0.08, 160);
      parallaxRef.current.style.transform = `translate3d(0, ${offset}px, 0)`;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="site-background" aria-hidden="true">
      <div className="site-background-parallax" ref={parallaxRef}>
        <div className="hero-glow" />
        <div className="hero-gold-light" />
        <div className="hero-particles">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="hero-particle"
              style={{
                left: p.left,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
