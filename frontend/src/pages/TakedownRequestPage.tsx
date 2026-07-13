import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPersonas, submitTakedownRequest, type PersonaSummary } from "../lib/api";

export default function TakedownRequestPage() {
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [personaId, setPersonaId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPersonas().then(setPersonas).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitTakedownRequest({
        persona_id: personaId || null,
        requester_name: name,
        requester_email: email,
        reason,
      });
      setResult(`${res.message} (referência: ${res.id})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar o pedido. Tenta novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="home-page">
        <h1>Pedido enviado</h1>
        <p>{result}</p>
        <Link to="/">← Voltar aos mentores</Link>
      </main>
    );
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <h1>Pedido de remoção ou correção</h1>
        <p>
          Se representas uma figura pública (ou o seu espólio/representante
          legal) referenciada numa das personas desta plataforma, podes pedir
          aqui a remoção ou correção da persona. Ver as regras completas em{" "}
          <code>docs/LEGAL-GUARDRAILS.md</code>.
        </p>
      </header>

      <form className="takedown-form" onSubmit={handleSubmit}>
        <label>
          Persona em causa (opcional)
          <select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
            <option value="">— Pedido geral / não específico a uma persona —</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          O teu nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          O teu email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          Motivo do pedido
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={5}
            placeholder="Descreve o que pretendes que seja removido ou corrigido, e porquê."
          />
        </label>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "A enviar…" : "Enviar pedido"}
        </button>
      </form>

      <Link to="/" className="back-link">
        ← Voltar aos mentores
      </Link>
    </main>
  );
}
