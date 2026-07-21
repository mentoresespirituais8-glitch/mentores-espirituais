import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import DisclaimerBanner from "../components/DisclaimerBanner";
import Avatar from "../components/Avatar";
import { deleteChatSession, fetchChatHistory, fetchPersonas, fetchSynthesizedMentors, resolveAudioUrl, sendChatMessage, type ResponseSource } from "../lib/api";
import { PERSONA_GREETINGS, SYNTHESIS_GREETING } from "../lib/greetings";

// A sessão fica presa ao mentor no browser deste utilizador — o mentor não
// esquece a conversa ao recarregar a página; o histórico fica persistido em
// base de dados no backend (ver app/db/models.py::ChatMessage), sobrevive a
// reinícios do servidor.
function sessionStorageKey(personaId: string): string {
  return `mentores-espirituais:sessao:${personaId}`;
}

// Ritual e resultado (Fase 8): a intenção declarada antes da chamada fica
// guardada por mentor, tal como a sessão — sobrevive a recarregar a página.
function intentionStorageKey(personaId: string): string {
  return `mentores-espirituais:intencao:${personaId}`;
}

const INTENTION_SUGGESTIONS = [
  "Encontrar calma",
  "Procurar orientação",
  "Explorar os ensinamentos",
  "Desabafar",
];

// Pedido de reflexão final — segue pelo fluxo de chat normal, por isso passa
// pelos guardrails e pela memória como qualquer outra mensagem.
const REFLECTION_REQUEST =
  "Antes de terminarmos, oferece-me uma breve reflexão sobre a nossa conversa " +
  "de hoje — o essencial que explorámos e algo simples que eu possa levar comigo.";

// Web Speech API — sem tipos oficiais no TS/DOM lib e só disponível com
// prefixo "webkit" em Chrome/Edge; Safari e Firefox ainda não suportam.
// TODO(pagamento): quando existirem contas de utilizador, ligar aqui a
// verificação de plano pago — modo de voz (falar + ouvir) fica reservado a
// contas pagas, o chat de texto mantém-se grátis (ver conversa sobre
// free vs. pago).
const SpeechRecognitionCtor: any =
  typeof window !== "undefined" ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition : null;

interface Message {
  role: "user" | "assistant";
  text: string;
  blocked?: boolean;
  /** Raízes da resposta: excertos reais das fontes usados pelo RAG. */
  sources?: ResponseSource[];
  /** Aviso de segurança com linhas de apoio (ver safety_notice na API). */
  safetyNotice?: string | null;
}

/**
 * "Ver as raízes desta resposta" (camada de confiança, Fase 6): painel
 * discreto com os excertos reais das fontes públicas que o RAG recuperou
 * para fundamentar a resposta. Sem excertos, sinaliza honestamente que a
 * resposta é interpretativa — nunca fingimos fundamentação que não existe.
 */
function MessageRoots({ sources }: { sources: ResponseSource[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="roots">
      <button
        type="button"
        className="roots-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "Ocultar raízes" : "Ver as raízes desta resposta"}
      </button>
      {open && (
        <div className="roots-panel">
          {sources.length === 0 ? (
            <p className="roots-empty">
              Não foi recuperado nenhum excerto direto das fontes para esta
              pergunta — esta resposta é uma interpretação da IA a partir dos
              princípios gerais dos ensinamentos que estuda.
            </p>
          ) : (
            <>
              <p className="roots-intro">
                Excertos das fontes públicas que fundamentaram esta resposta:
              </p>
              {sources.map((s, i) => (
                <blockquote key={i} className="roots-quote">
                  “{s.excerpt}”
                  <cite>{s.source_title}</cite>
                </blockquote>
              ))}
              <p className="roots-note">
                A resposta combina estes excertos com interpretação gerada por
                IA — não é uma declaração da figura real.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * "Ouvir outra perspetiva" (Fase 8): leva a mesma pergunta a outro mentor —
 * o contraste entre tradições é valor educativo, não uma falha.
 */
function OtherPerspectives({
  options,
  question,
}: {
  options: { id: string; name: string }[];
  question: string;
}) {
  const [open, setOpen] = useState(false);

  if (options.length === 0) return null;

  return (
    <div className="perspectives">
      <button
        type="button"
        className="roots-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "Fechar perspetivas" : "Ouvir outra perspetiva"}
      </button>
      {open && (
        <div className="perspectives-list">
          <p className="perspectives-intro">Levar esta pergunta a outro mentor:</p>
          {options.map((o) => (
            <Link
              key={o.id}
              to={`/chamada/${o.id}?pergunta=${encodeURIComponent(question)}`}
              className="perspective-link"
            >
              {o.name} →
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface CallTarget {
  id: string;
  display_name: string;
  inspiredBy: string[];
  tagline: string;
  topics: string[];
  kind: "persona" | "mentor";
  avatarAsset: string | null;
}

export default function PersonaCall() {
  const { personaId = "" } = useParams();
  const [target, setTarget] = useState<CallTarget | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [mode, setMode] = useState<"texto" | "voz">("texto");
  const [connecting, setConnecting] = useState(true);
  const [resetting, setResetting] = useState(false);
  // Ritual e resultado (Fase 8): intenção pré-chamada + outros mentores para
  // "ouvir outra perspetiva".
  const [intention, setIntention] = useState<string | null>(null);
  const [intentionDraft, setIntentionDraft] = useState("");
  const [showIntention, setShowIntention] = useState(false);
  const [others, setOthers] = useState<{ id: string; name: string }[]>([]);
  // Controlos de chamada (Fase 4): silenciar a voz do mentor e modo
  // mãos-livres (conversa contínua por voz, como numa chamada real).
  // Refs espelham o estado para serem lidas dentro de callbacks de áudio.
  const [muted, setMuted] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  // Vista da página (decisão do Hugo, 2026-07-21): por defeito uma conversa
  // estilo WhatsApp/Messenger (wallpaper com a imagem do mentor); o botão 🎥
  // muda para o ecrã de videochamada a ecrã inteiro, como numa chamada real.
  const [callMode, setCallMode] = useState(false);
  const mutedRef = useRef(false);
  const handsFreeRef = useRef(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const sessionId = useRef<string | null>(null);
  const greetingRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const avatarWrapperRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const talkRafRef = useRef<number | null>(null);

  useEffect(() => {
    setTarget(null);
    setLoadError(null);
    sessionId.current = null;
    setIntention(null);
    setShowIntention(false);

    async function restoreOrGreet(greeting: string) {
      greetingRef.current = greeting;
      const storedSessionId = localStorage.getItem(sessionStorageKey(personaId));
      if (storedSessionId) {
        try {
          const history = await fetchChatHistory(storedSessionId);
          if (history.messages.length > 0) {
            sessionId.current = storedSessionId;
            setMessages(history.messages.map((m) => ({ role: m.role, text: m.content })));
            setIntention(localStorage.getItem(intentionStorageKey(personaId)));
            return;
          }
        } catch {
          // Sessão guardada já não existe no backend (ex. reiniciou) — começa de novo.
        }
      }
      setMessages([{ role: "assistant", text: greeting }]);
      const savedIntention = localStorage.getItem(intentionStorageKey(personaId));
      if (savedIntention) {
        setIntention(savedIntention);
      } else {
        // Conversa nova: convite (saltável) a declarar uma intenção.
        setShowIntention(true);
      }
    }

    Promise.all([fetchPersonas(), fetchSynthesizedMentors()])
      .then(([personas, mentors]) => {
        setOthers([
          ...personas
            .filter((p) => p.id !== personaId)
            .map((p) => ({ id: p.id, name: p.display_name })),
          ...mentors
            .filter((m) => m.id !== personaId)
            .map((m) => ({ id: m.id, name: m.display_name })),
        ]);
        // "Ouvir outra perspetiva" chega com a pergunta no URL — pré-preenche
        // o campo de escrita, a pessoa decide se envia.
        const asked = new URLSearchParams(window.location.search).get("pergunta");
        if (asked) setInput(asked);

        const persona = personas.find((p) => p.id === personaId);
        if (persona) {
          setTarget({
            id: persona.id,
            display_name: persona.display_name,
            inspiredBy: persona.inspired_by,
            tagline: persona.tagline,
            topics: persona.topics,
            kind: "persona",
            avatarAsset: persona.avatar.asset,
          });
          restoreOrGreet(
            PERSONA_GREETINGS[persona.id] ?? `Olá! Sou o ${persona.display_name}. Podes perguntar-me sobre ${persona.topics.join(", ")}.`
          );
          return;
        }

        const mentor = mentors.find((m) => m.id === personaId);
        if (mentor) {
          const sourcePersonas = mentor.source_persona_ids
            .map((id) => personas.find((p) => p.id === id))
            .filter((p): p is (typeof personas)[number] => Boolean(p));
          const sourceNames = sourcePersonas.map((p) => p.display_name);
          const inspiredBy = sourcePersonas.flatMap((p) => p.inspired_by);
          setTarget({
            id: mentor.id,
            display_name: mentor.display_name,
            inspiredBy,
            tagline: `Síntese de perspetivas de: ${sourceNames.join(", ")}`,
            topics: [],
            kind: "mentor",
            avatarAsset: mentor.avatar_asset,
          });
          restoreOrGreet(SYNTHESIS_GREETING);
          return;
        }

        setLoadError("Mentor não encontrado.");
      })
      .catch((err) =>
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : "Não foi possível ligar ao mentor. Tenta novamente daqui a um minuto."
        )
      );
  }, [personaId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, [personaId]);

  useEffect(() => {
    if (!target) return;
    // Simula o "a ligar…" de uma chamada real antes de mostrar "em chamada" —
    // dispara sempre que se entra numa nova chamada (troca de mentor).
    setConnecting(true);
    const timer = setTimeout(() => setConnecting(false), 1400);
    return () => clearTimeout(timer);
  }, [target?.id]);

  useEffect(() => {
    return () => {
      if (talkRafRef.current) cancelAnimationFrame(talkRafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  function setTalkLevel(level: number, roundness = 0) {
    const el = avatarWrapperRef.current;
    if (!el) return;
    el.style.setProperty("--talk-level", level.toFixed(3));
    // 0 = som "largo" (i/e/s, boca esticada) … 1 = som "redondo" (o/u, boca
    // arredondada). Derivado do equilíbrio graves/agudos — visema aproximado.
    el.style.setProperty("--talk-round", roundness.toFixed(3));
  }

  // Sincroniza a animação do avatar com o volume real do áudio a tocar (em
  // vez de um ciclo fixo) — dá a sensação de estar mesmo a falar, não só um
  // "pulsar" genérico. Não é lip-sync (a boca não se move de facto), mas é
  // gratuito e não depende de nenhum fornecedor externo.
  function playWithReactiveAvatar(url: string) {
    const audio = new Audio(url);
    audioElRef.current = audio;

    const stop = () => {
      if (talkRafRef.current) cancelAnimationFrame(talkRafRef.current);
      talkRafRef.current = null;
      setTalkLevel(0);
      setSpeaking(false);
      // Modo mãos-livres: quando o mentor acaba de falar, volta a ouvir —
      // a conversa flui sem tocar em nada, como numa chamada real.
      if (handsFreeRef.current) {
        setTimeout(() => startListening(), 500);
      }
    };
    audio.onended = stop;
    audio.onerror = stop;

    try {
      if (!audioCtxRef.current) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctor();
      }
      const audioCtx = audioCtxRef.current;
      audioCtx.resume().catch(() => {});

      const source = audioCtx.createMediaElementSource(audio);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      const data = new Uint8Array(analyser.frequencyBinCount);
      // Bandas aproximadas para voz (fftSize 256 → ~86 Hz por bin @44.1kHz):
      // graves 90-900 Hz dominam em vogais fechadas/redondas (o, u, m);
      // agudos 1.7-6 kHz dominam em vogais abertas largas e sibilantes (i, e, s).
      const LOW_START = 1, LOW_END = 10, HIGH_START = 20, HIGH_END = 70;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
        let low = 0;
        for (let i = LOW_START; i < LOW_END; i++) low += data[i];
        low /= LOW_END - LOW_START;
        let high = 0;
        for (let i = HIGH_START; i < HIGH_END; i++) high += data[i];
        high /= HIGH_END - HIGH_START;
        const roundness = low + high > 12 ? low / (low + high) : 0.5;
        setTalkLevel(avg / 255, roundness);
        talkRafRef.current = requestAnimationFrame(tick);
      };
      audio.onplay = () => tick();
    } catch {
      // Web Audio API indisponível/falhou a ligar — o áudio continua a
      // tocar normalmente, só sem a animação reativa ao volume.
    }

    audio.play().catch(stop);
  }

  function startListening() {
    if (!SpeechRecognitionCtor || listening || sending) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "pt-PT";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setMode("voz");
      handleSend(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function toggleMute() {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next && audioElRef.current) {
      // Silencia imediatamente o que está a tocar (não só as próximas respostas).
      audioElRef.current.pause();
      if (talkRafRef.current) cancelAnimationFrame(talkRafRef.current);
      talkRafRef.current = null;
      setTalkLevel(0);
      setSpeaking(false);
    }
  }

  function toggleHandsFree() {
    const next = !handsFreeRef.current;
    handsFreeRef.current = next;
    setHandsFree(next);
    if (next) {
      setMode("voz");
      startListening();
    } else {
      stopListening();
    }
  }

  async function handleReset() {
    if (resetting || sending) return;
    const confirmed = window.confirm(
      "Começar de novo apaga esta conversa e tudo o que o mentor recorda dela. Continuar?"
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      if (sessionId.current) {
        await deleteChatSession(sessionId.current);
      }
    } catch {
      // Mesmo que o backend falhe (ex. a acordar), recomeçamos localmente —
      // a sessão antiga fica órfã e é inofensiva.
    } finally {
      localStorage.removeItem(sessionStorageKey(personaId));
      localStorage.removeItem(intentionStorageKey(personaId));
      sessionId.current = null;
      setMessages([{ role: "assistant", text: greetingRef.current }]);
      setIntention(null);
      setResetting(false);
      setShowIntention(true);
    }
  }

  function lastUserQuestionBefore(index: number): string | null {
    for (let j = index - 1; j >= 0; j--) {
      if (messages[j].role === "user") return messages[j].text;
    }
    return null;
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    setSpeaking(true);

    try {
      const res = await sendChatMessage(
        personaId,
        text,
        sessionId.current,
        target?.kind ?? "persona",
        intention
      );
      sessionId.current = res.session_id;
      localStorage.setItem(sessionStorageKey(personaId), res.session_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.reply,
          blocked: res.blocked,
          sources: res.sources,
          safetyNotice: res.safety_notice,
        },
      ]);
      if (res.audio_url && !mutedRef.current) {
        // Mantém a animação de "a falar" enquanto o áudio toca mesmo,
        // não só até a resposta HTTP chegar — dá sensação de conversa real.
        playWithReactiveAvatar(resolveAudioUrl(res.audio_url));
      } else {
        setSpeaking(false);
        // Sem áudio (ou silenciado), o modo mãos-livres continua a escutar.
        if (handsFreeRef.current) {
          setTimeout(() => startListening(), 500);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível obter resposta do mentor. Tenta novamente.";
      setMessages((prev) => [...prev, { role: "assistant", text: message }]);
      setSpeaking(false);
    } finally {
      setSending(false);
    }
  }

  if (!target) {
    return (
      <main className="call-page">
        <p>{loadError ?? "A carregar mentor…"}</p>
        {loadError && (
          <button type="button" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        )}
        <Link to="/">Voltar</Link>
      </main>
    );
  }

  return (
    <main className="call-page">
      <DisclaimerBanner />

      <div className={`call-layout ${callMode ? "layout-call" : "layout-chat"}`}>
        <section
          className="video-panel"
          style={
            target.avatarAsset
              ? ({ "--persona-wallpaper": `url(/${target.avatarAsset})` } as CSSProperties)
              : undefined
          }
        >
          <Link to="/" className="leave-call-button" title="Sair da chamada" aria-label="Sair da chamada">
            ← Sair
          </Link>
          {/* Nível 1: "webcam" simulada — moldura maior com zoom/pan lento,
              piscar de olhos periódico e um "a ligar…" inicial, para parecer
              uma videochamada real sem depender de nenhum fornecedor externo.
              Nível 2 (lip-sync real) liga aqui quando /avatar/render devolver
              um video_url real — ver backend/app/avatar/router.py. */}
          <div className="avatar-wrapper" ref={avatarWrapperRef}>
            <div className={`avatar-frame ${connecting ? "avatar-connecting" : ""}`}>
              <div className="avatar-kenburns">
                {/* Camada extra "cabeça": oscilação lenta e subtil enquanto o
                    mentor fala (rotação com origem na zona do pescoço), por
                    cima do Ken Burns — dá a sensação de uma pessoa que se
                    mexe naturalmente ao falar, não uma foto que só pulsa. */}
                <div className={`avatar-head ${speaking ? "avatar-head-speaking" : ""}`}>
                  <Avatar
                    assetPath={target.avatarAsset}
                    name={target.display_name}
                    eager
                    className={`avatar-circle ${speaking ? "avatar-speaking" : listening ? "avatar-listening" : "avatar-idle"}`}
                  />
                </div>
              </div>
              {target.avatarAsset && !connecting && <span className="avatar-blink" aria-hidden="true" />}
              {target.avatarAsset && speaking && <span className="avatar-mouth" aria-hidden="true" />}
            </div>
            <span className="avatar-mode-badge" title={mode === "voz" ? "Modo de voz" : "Modo de texto"}>
              {mode === "voz" ? "🎙" : "💬"}
            </span>
          </div>
          <h2>{target.display_name}</h2>
          <p className="persona-inspired-by">Inspirado em {target.inspiredBy.join(" / ")}</p>
          <p className="persona-tagline">{target.tagline}</p>
          <span className="call-status">
            {connecting ? "a ligar…" : listening ? "a ouvir…" : speaking ? "a responder…" : "em chamada"}
          </span>
          {intention && (
            <span className="intention-chip" title="Intenção desta conversa">
              🧭 {intention}
            </span>
          )}

          <div className="call-controls">
            {SpeechRecognitionCtor && (
              <button
                type="button"
                className={`call-control-button ${handsFree ? "call-control-active" : ""}`}
                onClick={toggleHandsFree}
                title={
                  handsFree
                    ? "Desligar modo mãos-livres"
                    : "Modo mãos-livres: fala e ouve continuamente, sem tocar em nada"
                }
                aria-pressed={handsFree}
              >
                <span className="ctl-icon" aria-hidden="true">🎙</span>
                <span className="ctl-label"> Mãos-livres</span>
              </button>
            )}
            <button
              type="button"
              className={`call-control-button ${muted ? "call-control-active" : ""}`}
              onClick={toggleMute}
              title={muted ? "Voltar a ouvir a voz do mentor" : "Silenciar a voz do mentor"}
              aria-pressed={muted}
            >
              <span className="ctl-icon" aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
              <span className="ctl-label">{muted ? " Som desligado" : " Som ligado"}</span>
            </button>
            <button
              type="button"
              className="call-control-button"
              onClick={() => handleSend(REFLECTION_REQUEST)}
              disabled={sending || resetting || messages.length < 3}
              title="Pedir ao mentor uma breve reflexão final sobre a conversa de hoje"
            >
              <span className="ctl-icon" aria-hidden="true">🕯</span>
              <span className="ctl-label"> Encerrar com reflexão</span>
            </button>
            <button
              type="button"
              className="call-control-button call-back-to-chat"
              onClick={() => setCallMode(false)}
              title="Voltar à conversa de mensagens"
            >
              <span className="ctl-icon" aria-hidden="true">💬</span>
              <span className="ctl-label"> Mensagens</span>
            </button>
          </div>
        </section>

        <section className="chat-panel">
          {/* Cabeçalho estilo WhatsApp: avatar pequeno, nome, estado e ações.
              O botão 🎥 muda para o ecrã de videochamada. */}
          <header className="chat-header">
            <Link to="/" className="chat-header-back" title="Sair da conversa" aria-label="Sair da conversa">
              ←
            </Link>
            <Avatar
              assetPath={target.avatarAsset}
              name={target.display_name}
              eager
              className="chat-header-avatar"
            />
            <div className="chat-header-meta">
              <strong>{target.display_name}</strong>
              <span className="chat-header-status">
                {connecting
                  ? "a ligar…"
                  : listening
                    ? "a ouvir…"
                    : sending || speaking
                      ? "a escrever…"
                      : "online"}
                {intention ? ` · 🧭 ${intention}` : ""}
              </span>
            </div>
            <div className="chat-header-actions">
              <button
                type="button"
                onClick={() => handleSend(REFLECTION_REQUEST)}
                disabled={sending || resetting || messages.length < 3}
                title="Encerrar com uma breve reflexão sobre a conversa"
                aria-label="Encerrar com reflexão"
              >
                🕯
              </button>
              <button
                type="button"
                onClick={toggleMute}
                title={muted ? "Voltar a ouvir a voz do mentor" : "Silenciar a voz do mentor"}
                aria-pressed={muted}
                aria-label={muted ? "Som desligado" : "Som ligado"}
              >
                {muted ? "🔇" : "🔊"}
              </button>
              <button
                type="button"
                className="chat-header-call"
                onClick={() => setCallMode(true)}
                title="Passar para videochamada"
                aria-label="Passar para videochamada"
              >
                🎥
              </button>
            </div>
          </header>

          <div
            className="chat-messages"
            ref={scrollRef}
            style={
              target.avatarAsset
                ? ({ "--persona-wallpaper": `url(/${target.avatarAsset})` } as CSSProperties)
                : undefined
            }
          >
            {messages.map((m, i) => (
              <div key={i} className={`chat-row chat-row-${m.role}`}>
                {m.role === "assistant" && (
                  <Avatar assetPath={target.avatarAsset} name={target.display_name} className="chat-avatar" />
                )}
                <div className={`chat-bubble chat-bubble-${m.role} ${m.blocked ? "chat-bubble-blocked" : ""}`}>
                  {m.text}
                  {m.safetyNotice && (
                    <p className="safety-notice" role="note">
                      {m.safetyNotice}
                    </p>
                  )}
                  {m.role === "assistant" && !m.blocked && m.sources !== undefined && (
                    <MessageRoots sources={m.sources} />
                  )}
                  {m.role === "assistant" && !m.blocked && lastUserQuestionBefore(i) !== null && (
                    <OtherPerspectives options={others} question={lastUserQuestionBefore(i)!} />
                  )}
                </div>
              </div>
            ))}
            {sending && !listening && (
              <div className="chat-row chat-row-assistant">
                <Avatar assetPath={target.avatarAsset} name={target.display_name} className="chat-avatar" />
                <div className="chat-bubble chat-bubble-assistant chat-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              setMode("texto");
              handleSend();
            }}
          >
            {SpeechRecognitionCtor && (
              <button
                type="button"
                className={`mic-button ${listening ? "mic-button-recording" : ""}`}
                onClick={listening ? stopListening : startListening}
                disabled={sending}
                title={listening ? "A ouvir… clica para parar" : "Falar com o mentor"}
                aria-label={listening ? "A ouvir… clica para parar" : "Falar com o mentor"}
              >
                🎙
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "A ouvir…" : `Pergunta algo ao ${target.display_name}…`}
              disabled={sending || listening}
            />
            <button type="submit" disabled={sending || !input.trim()}>
              Enviar
            </button>
          </form>

          <div className="memory-note">
            <span>
              Este mentor recorda o essencial das vossas conversas para te acompanhar melhor.
            </span>
            <button
              type="button"
              className="memory-reset-button"
              onClick={handleReset}
              disabled={resetting || sending}
            >
              {resetting ? "A apagar…" : "Começar de novo"}
            </button>
          </div>
        </section>
      </div>

      {showIntention && (
        <div
          className="intention-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Definir uma intenção para esta chamada"
        >
          <div className="intention-card">
            <h3>Antes de começar…</h3>
            <p>
              O que te traz a esta chamada? Declarar uma intenção ajuda o mentor a
              acompanhar-te — mas é totalmente opcional.
            </p>
            <div className="intention-suggestions">
              {INTENTION_SUGGESTIONS.map((sugestao) => (
                <button
                  key={sugestao}
                  type="button"
                  className={`topic-pill intention-pill ${
                    intentionDraft === sugestao ? "intention-pill-active" : ""
                  }`}
                  onClick={() => setIntentionDraft(sugestao)}
                >
                  {sugestao}
                </button>
              ))}
            </div>
            <input
              value={intentionDraft}
              onChange={(e) => setIntentionDraft(e.target.value)}
              placeholder="…ou escreve com as tuas palavras"
              aria-label="Intenção com as tuas palavras"
            />
            <div className="intention-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowIntention(false);
                  setIntentionDraft("");
                }}
              >
                Saltar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!intentionDraft.trim()}
                onClick={() => {
                  const value = intentionDraft.trim();
                  setIntention(value);
                  localStorage.setItem(intentionStorageKey(personaId), value);
                  setShowIntention(false);
                  setIntentionDraft("");
                }}
              >
                Começar com esta intenção
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
