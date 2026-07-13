const FILLER_WORDS = new Set(["mentor", "mentora", "de", "do", "da", "dos", "das", "e"]);

/** Iniciais para o avatar-placeholder — ignora palavras genéricas ("Mentor
 * de/do...") para não mostrar "MD" em quase todas as personas. */
export function initials(name: string): string {
  const words = name.split(" ").filter(Boolean);
  const significant = words.filter((w) => !FILLER_WORDS.has(w.toLowerCase()));
  const source = significant.length >= 2 ? significant : words;
  return source
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
