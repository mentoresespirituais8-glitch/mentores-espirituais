export interface AvatarConfig {
  style: string;
  asset: string;
  voice_provider: string;
  voice_id: string;
}

export interface PersonaSummary {
  id: string;
  slug: string;
  display_name: string;
  inspired_by: string[];
  tagline: string;
  status: "publico" | "licenciado" | "suspenso";
  avatar: AvatarConfig;
  topics: string[];
}

export interface ResponseSource {
  source_title: string;
  excerpt: string;
}

export interface ChatResponse {
  persona_id: string;
  session_id: string;
  reply: string;
  disclaimer: string;
  blocked: boolean;
  block_reason?: string | null;
  audio_url?: string | null;
  /** Excertos reais das fontes que fundamentaram a resposta (painel "Ver as
   * raízes desta resposta"). Vazio = resposta interpretativa. */
  sources?: ResponseSource[];
  /** Segurança de crise (Fase 7): aviso com linhas de apoio reais, presente
   * quando a mensagem do utilizador continha sinais de autolesão/crise. */
  safety_notice?: string | null;
}

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: ChatHistoryTurn[];
}

export interface SynthesisMentorSummary {
  id: string;
  slug: string;
  display_name: string;
  source_persona_ids: string[];
  synthesis_prompt_notes: string;
  status: "publico" | "licenciado" | "suspenso";
  avatar_asset: string | null;
}

// Em desenvolvimento, o Vite faz proxy de /api para localhost:8000 (ver
// vite.config.ts) — não existe esse proxy depois de publicado. Em produção,
// VITE_API_BASE_URL aponta diretamente para o backend publicado (ex.
// https://mentores-espirituais-backend.onrender.com) e passa a ser a base de
// TODOS os pedidos, incluindo o /static/audio dos áudios gerados (ver
// resolveAudioUrl abaixo) — o backend não tem prefixo /api nas próprias rotas.
const API_ORIGIN = import.meta.env.VITE_API_BASE_URL ?? "";
const BASE = API_ORIGIN ? API_ORIGIN : "/api";

// O backend publicado corre no nível gratuito do Render, que "adormece" o
// serviço após ~15 min sem visitas — o primeiro pedido a seguir demora até
// um minuto (ou falha ao nível da rede enquanto o serviço arranca). Sem
// isto, o utilizador via um "Failed to fetch" críptico em inglês.
const WAKE_MESSAGE =
  "O mentor está a acordar — o servidor adormece quando ninguém o visita. " +
  "Aguarda um minuto e tenta novamente.";

async function safeFetch(input: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    // Falha de rede (servidor a arrancar, sem internet, CORS de página de
    // erro) — mensagem amigável em vez do TypeError do browser.
    throw new Error(WAKE_MESSAGE);
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error(WAKE_MESSAGE);
  }
  return res;
}

/** audio_url vem do backend como caminho relativo (/static/audio/x.mp3).
 * Em dev isso basta (proxy do Vite); em produção tem de apontar para o
 * domínio real do backend. */
export function resolveAudioUrl(audioUrl: string): string {
  if (/^https?:\/\//.test(audioUrl)) return audioUrl;
  return `${API_ORIGIN}${audioUrl}`;
}

export async function fetchPersonas(): Promise<PersonaSummary[]> {
  const res = await safeFetch(`${BASE}/personas`);
  if (!res.ok) throw new Error("Falha ao carregar mentores");
  return res.json();
}

export async function fetchSynthesizedMentors(): Promise<SynthesisMentorSummary[]> {
  const res = await safeFetch(`${BASE}/personas/mentores/sintetizados`);
  if (!res.ok) throw new Error("Falha ao carregar mentores sintetizados");
  return res.json();
}

export interface TakedownRequestInput {
  persona_id: string | null;
  requester_name: string;
  requester_email: string;
  reason: string;
}

export interface TakedownRequestResponse {
  id: string;
  status: string;
  message: string;
}

export async function submitTakedownRequest(
  payload: TakedownRequestInput
): Promise<TakedownRequestResponse> {
  const res = await fetch(`${BASE}/takedown-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ? JSON.stringify(body.detail) : "Falha ao enviar pedido");
  }
  return res.json();
}

/** Apaga o histórico e a memória de uma sessão no backend — usado pelo botão
 * "Começar de novo" em PersonaCall.tsx (controlo do utilizador sobre o que o
 * mentor recorda). */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await safeFetch(`${BASE}/chat/session/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Falha ao apagar a conversa");
}

export async function fetchChatHistory(sessionId: string): Promise<ChatHistoryResponse> {
  const res = await fetch(`${BASE}/chat/session/${sessionId}`);
  if (!res.ok) throw new Error("Falha ao carregar histórico da conversa");
  return res.json();
}

export async function sendChatMessage(
  personaId: string,
  message: string,
  sessionId: string | null,
  kind: "persona" | "mentor" = "persona"
): Promise<ChatResponse> {
  const res = await safeFetch(`${BASE}/chat/${kind}/${personaId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : "Falha ao enviar mensagem");
  }
  return res.json();
}
