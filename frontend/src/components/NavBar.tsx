import { useState } from "react";

const LINKS = [
  { href: "#inicio", label: "Início" },
  { href: "#mentores", label: "Mentores" },
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#porque-confiar", label: "Sobre" },
  { href: "#contacto", label: "Contacto" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);

  function handleLinkClick() {
    setOpen(false);
  }

  return (
    <nav className="nav-bar" aria-label="Navegação principal">
      <a href="#inicio" className="nav-brand" onClick={handleLinkClick}>
        <img src="/logo-mark.png" alt="" aria-hidden="true" />
        Mentores Espirituais
      </a>

      <ul className={`nav-links ${open ? "is-open" : ""}`}>
        {LINKS.map((link) => (
          <li key={link.href}>
            <a href={link.href} onClick={handleLinkClick}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <a href="#mentores" className="nav-cta">
          Começar Conversa
        </a>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
    </nav>
  );
}
