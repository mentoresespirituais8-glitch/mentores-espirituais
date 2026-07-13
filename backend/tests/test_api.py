from app.chat import router as chat_router


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_list_personas_endpoint_includes_known_personas(client):
    res = client.get("/personas")
    assert res.status_code == 200
    ids = {p["id"] for p in res.json()}
    assert "etica-compaixao-01" in ids
    assert "allan-kardec-01" in ids


def test_persona_response_never_includes_full_source_dossier(client):
    """Regra de privacidade do dossiê: a listagem pública não deve vazar
    knowledge_chunks nem sources — só o resumo (PersonaSummary)."""
    res = client.get("/personas")
    for persona in res.json():
        assert "knowledge_chunks" not in persona
        assert "sources" not in persona


def test_get_unknown_persona_returns_404(client):
    res = client.get("/personas/nao-existe-123")
    assert res.status_code == 404


def test_chat_with_persona_always_includes_disclaimer(client, monkeypatch):
    # Nunca depender da API real da Gemini nos testes — lenta, sujeita a
    # quota, e testa um serviço externo em vez do nosso código.
    monkeypatch.setattr(chat_router, "_call_llm", lambda *a, **k: "resposta simulada")
    res = client.post("/chat/persona/etica-compaixao-01", json={"message": "Olá"})
    assert res.status_code == 200
    body = res.json()
    assert "simulação criada por Inteligência Artificial" in body["disclaimer"]


def test_chat_with_unknown_persona_returns_404(client):
    res = client.post("/chat/persona/nao-existe-123", json={"message": "Olá"})
    assert res.status_code == 404


def test_chat_with_synthesis_mentor_includes_disclaimer(client, monkeypatch):
    monkeypatch.setattr(chat_router, "_call_llm", lambda *a, **k: "resposta simulada")
    res = client.post("/chat/mentor/mentor-sabedoria-universal", json={"message": "Olá"})
    assert res.status_code == 200
    assert "simulação criada por Inteligência Artificial" in res.json()["disclaimer"]


def test_chat_history_persists_across_requests_via_session_id(client, monkeypatch):
    """A conversa tem de sobreviver a reinícios do backend (base de dados,
    não memória) — ver app/db/models.py::ChatMessage. Aqui simulamos duas
    trocas na mesma sessão e confirmamos que GET /chat/session/{id} devolve
    o histórico completo, na ordem certa."""
    monkeypatch.setattr(chat_router, "_call_llm", lambda *a, **k: "resposta simulada")

    first = client.post("/chat/persona/etica-compaixao-01", json={"message": "Primeira pergunta"})
    session_id = first.json()["session_id"]

    second = client.post(
        "/chat/persona/etica-compaixao-01",
        json={"message": "Segunda pergunta", "session_id": session_id},
    )
    assert second.json()["session_id"] == session_id

    history = client.get(f"/chat/session/{session_id}")
    assert history.status_code == 200
    messages = history.json()["messages"]
    assert [m["content"] for m in messages] == [
        "Primeira pergunta",
        "resposta simulada",
        "Segunda pergunta",
        "resposta simulada",
    ]
    assert [m["role"] for m in messages] == ["user", "assistant", "user", "assistant"]


def test_chat_history_for_unknown_session_is_empty(client):
    res = client.get("/chat/session/sessao-que-nao-existe")
    assert res.status_code == 200
    assert res.json()["messages"] == []
