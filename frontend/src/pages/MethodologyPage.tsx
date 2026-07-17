import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import SiteBackground from "../components/SiteBackground";
import DisclaimerBanner from "../components/DisclaimerBanner";

/**
 * Página pública de metodologia (camada de confiança, Fase 6): explica como
 * as respostas são construídas, de onde vêm as fontes e o que a plataforma
 * nunca faz. Linguagem clara, sem jargão técnico desnecessário.
 */
export default function MethodologyPage() {
  return (
    <>
      <SiteBackground />
      <NavBar />
      <main className="home-page method-page">
        <DisclaimerBanner />

        <span className="section-kicker">Transparência</span>
        <h1 className="section-heading">Como funcionam os mentores</h1>

        <section className="method-section">
          <h2>O que são os mentores</h2>
          <p>
            Cada mentor é uma simulação criada por Inteligência Artificial, inspirada em obras e
            ensinamentos historicamente associados a uma figura espiritual. Nenhum mentor é a pessoa
            real, não fala em nome dela e não estabelece qualquer contacto com ela — é uma
            ferramenta educativa para explorar textos e ideias que marcaram a humanidade.
          </p>
        </section>

        <section className="method-section">
          <h2>De onde vêm as respostas</h2>
          <p>
            As respostas são construídas a partir de fontes públicas — textos em domínio público ou
            com licença de distribuição gratuita, como os Evangelhos (tradução Almeida), "O Livro
            dos Espíritos" de Allan Kardec (1857), o Dhammapada e o Evangelho de Maria. Quando fazes
            uma pergunta, o sistema procura os excertos mais relevantes dessas obras e usa-os para
            fundamentar a resposta.
          </p>
          <p>
            Em cada resposta podes tocar em <strong>"Ver as raízes desta resposta"</strong> para
            veres exatamente que excertos foram usados. Quando nenhum excerto sustenta diretamente a
            pergunta, dizemos-to com clareza: a resposta é uma interpretação da IA a partir dos
            princípios gerais — nunca inventamos citações.
          </p>
        </section>

        <section className="method-section">
          <h2>Citação e interpretação são coisas diferentes</h2>
          <p>
            Os mentores são instruídos a distinguir sempre o que está escrito nas fontes ("segundo o
            texto...") do que é leitura interpretativa ("interpreto isto como..."). A IA pode errar
            e interpretar de formas discutíveis — por isso mostramos as raízes, para que possas ler
            e julgar por ti.
          </p>
        </section>

        <section className="method-section">
          <h2>Memória e os teus dados</h2>
          <p>
            Cada mentor recorda o essencial das vossas conversas (um resumo automático) para te
            acompanhar melhor ao longo do tempo. Esse resumo fica associado apenas à sessão no teu
            navegador — não pedimos conta, nome nem email para conversar. Podes apagar a conversa e
            tudo o que o mentor recorda a qualquer momento com o botão "Começar de novo".
          </p>
        </section>

        <section className="method-section">
          <h2>O que esta plataforma nunca faz</h2>
          <p>
            Não afirma contacto com figuras reais, espíritos ou o divino. Não substitui apoio
            médico, psicológico, jurídico ou financeiro. Não usa a voz ou a imagem real de nenhuma
            pessoa — os retratos são fictícios, gerados por IA, e as vozes são sintéticas e
            genéricas. Se alguma figura, herdeiro ou instituição considerar que algum conteúdo deve
            ser corrigido ou removido, existe um{" "}
            <Link to="/pedido-remocao">canal público de pedido de remoção</Link>.
          </p>
        </section>

        <div className="method-actions">
          <Link to="/" className="btn btn-primary">
            Voltar ao início
          </Link>
        </div>
      </main>
    </>
  );
}
