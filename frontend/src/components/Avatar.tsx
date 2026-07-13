import { initials } from "../lib/format";

interface AvatarProps {
  assetPath?: string | null;
  name: string;
  className?: string;
}

/** Regra 6 (docs/LEGAL-GUARDRAILS.md): retratos fictícios apenas para
 * figuras já falecidas, nunca apresentados como fotos reais da pessoa.
 * Se uma persona ainda não tiver um asset próprio, cai para as iniciais
 * do nome. */
export default function Avatar({ assetPath, name, className = "" }: AvatarProps) {
  if (assetPath) {
    return (
      <img src={`/${assetPath}`} alt={name} loading="lazy" decoding="async" className={`avatar-image ${className}`} />
    );
  }
  return (
    <div className={`persona-avatar-placeholder ${className}`} aria-label={name}>
      {initials(name)}
    </div>
  );
}
