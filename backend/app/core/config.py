from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

# Caminho absoluto para backend/.env — um env_file relativo ("​.env") só
# funciona se o processo for lançado com cwd=backend/. Quando o backend
# arranca a partir da raiz do repo (ex. --app-dir backend sem "cd" antes),
# um caminho relativo procurava o .env no sítio errado e o gemini_api_key
# ficava sempre vazio, caindo silenciosamente no modo de desenvolvimento.
_ENV_FILE = _BACKEND_DIR / ".env"


def _default_database_url() -> str:
    """Mesma questão do _ENV_FILE acima: 'sqlite:///./mentores.db' é relativo
    ao cwd do processo — se o backend arrancar a partir da raiz do repo, a
    base de dados acaba criada no sítio errado (já aconteceu). Ancorado a
    backend/ para funcionar seja qual for a pasta de onde arranca; ignorado
    se DATABASE_URL for definido explicitamente (ex. Postgres em produção)."""
    return f"sqlite:///{(_BACKEND_DIR / 'mentores.db').as_posix()}"


class Settings(BaseSettings):
    app_name: str = "Mentores Espirituais"
    environment: str = "development"

    # LLM provider usado para gerar respostas das personas e a moderação.
    # Gemini (Google AI Studio) por ter um nível gratuito generoso — ver
    # docs/PERSONA-TEMPLATE.md e README.md para como obter a chave.
    gemini_api_key: str = ""
    # Fixo a uma versão concreta, e não ao alias "gemini-flash-latest": esse
    # alias pode apontar de repente para um modelo novíssimo com quota
    # gratuita ainda muito reduzida (aconteceu — "gemini-3.5-flash" tinha só
    # 20 pedidos/dia). Modelos "-lite" já estabelecidos têm quotas maiores.
    llm_model: str = "gemini-3.1-flash-lite"
    moderation_model: str = "gemini-3.1-flash-lite"

    # TTS / avatar (nível 2 — lip-sync). Preencher quando escolhido o fornecedor.
    tts_provider: str = "generic-tts"
    tts_api_key: str = ""
    avatar_provider: str = ""
    avatar_api_key: str = ""

    # Base de dados
    database_url: str = Field(default_factory=_default_database_url)

    # Vector store para RAG (persona knowledge base)
    vector_store_path: str = "./data/vector_store"

    cors_origins: list[str] = ["http://localhost:5173"]

    # Limite de pedidos de chat — protege a chave de API (nível gratuito,
    # com quota diária partilhada por todos os visitantes) de uso abusivo.
    # Ver app/chat/rate_limit.py. Valores conservadores por precaução — já
    # vimos quotas gratuitas tão baixas quanto 20 pedidos/dia num modelo novo.
    rate_limit_per_window: int = 8
    rate_limit_window_seconds: int = 600
    rate_limit_per_day: int = 30

    model_config = SettingsConfigDict(env_file=_ENV_FILE)

    @property
    def disclaimer_text(self) -> str:
        return (
            "Esta personagem é uma simulação criada por Inteligência "
            "Artificial com fins educativos. As respostas são geradas com "
            "base em informação publicamente disponível e não representam "
            "declarações reais da pessoa nem qualquer afiliação oficial."
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
