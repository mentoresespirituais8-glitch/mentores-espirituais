from app.takedown import storage


def test_takedown_request_flow_creates_and_lists_record(client, tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "STORE_PATH", tmp_path / "takedown_requests.jsonl")

    create_res = client.post(
        "/takedown-requests",
        json={
            "persona_id": "etica-compaixao-01",
            "requester_name": "Nome de Teste",
            "requester_email": "teste@example.com",
            "reason": "Motivo de teste",
        },
    )
    assert create_res.status_code == 200
    body = create_res.json()
    assert body["status"] == "pendente"
    assert body["id"]

    list_res = client.get("/takedown-requests")
    assert list_res.status_code == 200
    records = list_res.json()
    assert any(r["id"] == body["id"] for r in records)


def test_takedown_request_rejects_invalid_email(client, tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "STORE_PATH", tmp_path / "takedown_requests.jsonl")

    res = client.post(
        "/takedown-requests",
        json={
            "requester_name": "Nome de Teste",
            "requester_email": "isto-nao-e-um-email",
            "reason": "Motivo de teste",
        },
    )
    assert res.status_code == 422
