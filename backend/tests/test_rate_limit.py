from app.chat import rate_limit, router as chat_router
from app.core.config import get_settings


def _stub_llm(system_prompt, history, user_message):
    return "resposta simulada para teste"


def test_rate_limit_blocks_after_too_many_messages_in_window(client, monkeypatch):
    monkeypatch.setattr(chat_router, "_call_llm", _stub_llm)
    rate_limit._WINDOW_HITS.clear()
    rate_limit._GLOBAL_DAY_HITS.clear()

    settings = get_settings()
    monkeypatch.setattr(settings, "rate_limit_per_window", 2)
    monkeypatch.setattr(settings, "rate_limit_per_day", 100)

    for _ in range(2):
        res = client.post("/chat/persona/etica-compaixao-01", json={"message": "Olá"})
        assert res.status_code == 200

    blocked = client.post("/chat/persona/etica-compaixao-01", json={"message": "Olá outra vez"})
    assert blocked.status_code == 429
    assert "demasiadas mensagens" in blocked.json()["detail"]

    rate_limit._WINDOW_HITS.clear()
    rate_limit._GLOBAL_DAY_HITS.clear()


def test_rate_limit_blocks_after_daily_cap(client, monkeypatch):
    monkeypatch.setattr(chat_router, "_call_llm", _stub_llm)
    rate_limit._WINDOW_HITS.clear()
    rate_limit._GLOBAL_DAY_HITS.clear()

    settings = get_settings()
    monkeypatch.setattr(settings, "rate_limit_per_window", 100)
    monkeypatch.setattr(settings, "rate_limit_per_day", 1)

    first = client.post("/chat/persona/etica-compaixao-01", json={"message": "Olá"})
    assert first.status_code == 200

    blocked = client.post("/chat/persona/etica-compaixao-01", json={"message": "Olá outra vez"})
    assert blocked.status_code == 429
    assert "limite diário" in blocked.json()["detail"]

    rate_limit._WINDOW_HITS.clear()
    rate_limit._GLOBAL_DAY_HITS.clear()


class _FakeClient:
    def __init__(self, host: str) -> None:
        self.host = host


class _FakeRequest:
    def __init__(self, host: str) -> None:
        self.client = _FakeClient(host)


def test_daily_cap_is_shared_across_different_ips(monkeypatch):
    """A quota da Gemini é por chave de API, não por visitante — por isso o
    limite diário tem de ser global, mesmo que o limite por janela seja
    por IP (para não deixar um único IP monopolizar a quota do dia)."""
    rate_limit._WINDOW_HITS.clear()
    rate_limit._GLOBAL_DAY_HITS.clear()

    settings = get_settings()
    monkeypatch.setattr(settings, "rate_limit_per_window", 100)
    monkeypatch.setattr(settings, "rate_limit_per_day", 1)

    rate_limit.enforce_rate_limit(_FakeRequest("1.2.3.4"))

    try:
        rate_limit.enforce_rate_limit(_FakeRequest("5.6.7.8"))
        assert False, "esperava-se HTTPException por limite diário global"
    except Exception as exc:  # HTTPException
        assert getattr(exc, "status_code", None) == 429
        assert "limite diário" in exc.detail

    rate_limit._WINDOW_HITS.clear()
    rate_limit._GLOBAL_DAY_HITS.clear()
