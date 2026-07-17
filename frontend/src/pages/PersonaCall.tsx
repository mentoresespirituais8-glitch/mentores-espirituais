import { useEffect, useRef, useState } from "react";
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
  // Controlos de chamada (Fase 4): silenciar a voz do mentor e modo
  // mãos-livres (conversa contínua por voz, como numa chamada real).
  // Refs espelham o estado para serem lidas dentro de callbacks de áudio.
  const [muted, setMuted] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
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

    async function restoreOrGreet(greeting: string) {
      greetingRef.current = greeting;
      const storedSessionId = localStorage.getItem(sessionStorageKey(personaId));
      if (storedSessionId) {
        try {
          const history = await fetchChatHistory(storedSessionId);
          if (history.messages.length > 0) {
            sessionId.current = storedSessionId;
            setMessages(history.messages.map((m) => ({ role: m.role, text: m.content })));
            return;
          }
        } catch {
          // Sessão guardada já não existe no backend (ex. reiniciou) — começa de novo.
        }
      }
      setMessages([{ role: "assistant", text: greeting }]);
    }

    Promise.all([fetchPersonas(), fetchSynthesizedMentors()])
      .then(([personas, mentors]) => {
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

  function setTalkLevel(level: number) {
    avatarWrapperRef.current?.style.setProperty("--talk-level", level.toFixed(3));
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
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
        setTalkLevel(avg / 255);
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
      sessionId.current = null;
      setMessages([{ role: "assistant", text: greetingRef.current }]);
      setResetting(false);
    }
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    setSpeaking(true);

    try {
      const res = await sendChatMessage(personaId, text, sessionId.current, target?.kind ?? "persona");
      sessionId.current = res.session_id;
      localStorage.setItem(sessionStorageKey(personaId), res.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.reply, blocked: res.blocked, sources: res.sources },
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

      <div className="call-layout">
        <section className="video-panel">
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
                🎙 Mãos-livres
              </button>
            )}
            <button
              type="button"
              className={`call-control-button ${muted ? "call-control-active" : ""}`}
              onClick={toggleMute}
              title={muted ? "Voltar a ouvir a voz do mentor" : "Silenciar a voz do mentor"}
              aria-pressed={muted}
            >
              {muted ? "🔇 Som desligado" : "🔊 Som ligado"}
            </button>
          </div>
        </section>

        <section className="chat-panel">
          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-row chat-row-${m.role}`}>
                {m.role === "assistant" && (
                  <Avatar assetPath={target.avatarAsset} name={target.display_name} className="chat-avatar" />
                )}
                <div className={`chat-bubble chat-bubble-${m.role} ${m.blocked ? "chat-bubble-blocked" : ""}`}>
                  {m.text}
                  {m.role === "assistant" && !m.blocked && m.sources !== undefined && (
                    <MessageRoots sources={m.sources} />
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
    </main>
  );
}
