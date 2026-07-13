const EXAMPLE_PILLS = ["Jesus", "Buda", "Allan Kardec", "Meditação", "Propósito", "Amor"];

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-section">
      <label className="visually-hidden" htmlFor="mentor-search">
        Com quem gostarias de conversar hoje?
      </label>
      <div className="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id="mentor-search"
          type="search"
          placeholder="Com quem gostarias de conversar hoje?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className="search-clear"
            aria-label="Limpar pesquisa"
            onClick={() => onChange("")}
          >
            ✕
          </button>
        )}
      </div>

      <div className="search-pills" role="group" aria-label="Sugestões de pesquisa">
        {EXAMPLE_PILLS.map((pill) => {
          const active = value.toLowerCase() === pill.toLowerCase();
          return (
            <button
              key={pill}
              type="button"
              className={`search-pill ${active ? "is-active" : ""}`}
              aria-pressed={active}
              onClick={() => onChange(active ? "" : pill)}
            >
              {pill}
            </button>
          );
        })}
      </div>
    </div>
  );
}
