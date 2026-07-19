"""
Testa a camada multiprovedor de voz (app/chat/tts.py): escolha por variável
de ambiente, fallback automático e a regra de ouro de que a voz nunca
bloqueia a resposta (falha total => None, sem exceção).
"""
import os

from app.chat import tts


def test_perfil_de_voz_por_mentor_existe_para_todas_as_personas():
    # Cada mentor publicado deve ter identidade vocal própria definida.
    for pid in (
        "etica-compaixao-01",
        "buda-01",
        "allan-kardec-01",
        "maria-madalena-01",
        "mentor-sabedoria-universal",
    ):
        assert pid in tts._VOICE_PROFILES


def test_fallback_para_gtts_quando_edge_falha(monkeypatch, tmp_path):
    monkeypatch.setenv("TTS_PROVIDER", "edge")
    chamadas = []

    def edge_falha(texto, persona_id, caminho):
        chamadas.append("edge")
        raise RuntimeError("serviço indisponível")

    def gtts_ok(texto, speaking_pace, caminho):
        chamadas.append("gtts")

    monkeypatch.setattr(tts, "_sintetizar_edge", edge_falha)
    monkeypatch.setattr(tts, "_sintetizar_gtts", gtts_ok)
    url = tts.sintetizar("Olá", persona_id="buda-01")
    assert url is not None and url.startswith("/static/audio/")
    assert chamadas == ["edge", "gtts"]


def test_sem_rede_nenhuma_devolve_none_sem_excecao(monkeypatch):
    def falha(*args, **kwargs):
        raise RuntimeError("sem rede")

    monkeypatch.setattr(tts, "_sintetizar_edge", falha)
    monkeypatch.setattr(tts, "_sintetizar_gtts", falha)
    assert tts.sintetizar("Olá", persona_id="buda-01") is None


def test_provider_gtts_ignora_edge(monkeypatch):
    monkeypatch.setenv("TTS_PROVIDER", "gtts")
    chamadas = []

    def edge(*a, **k):
        chamadas.append("edge")

    def gtts_ok(texto, speaking_pace, caminho):
        chamadas.append("gtts")

    monkeypatch.setattr(tts, "_sintetizar_edge", edge)
    monkeypatch.setattr(tts, "_sintetizar_gtts", gtts_ok)
    assert tts.sintetizar("Olá") is not None
    assert chamadas == ["gtts"]


def test_texto_longo_e_truncado(monkeypatch):
    recebido = {}

    def gtts_ok(texto, speaking_pace, caminho):
        recebido["len"] = len(texto)

    monkeypatch.setenv("TTS_PROVIDER", "gtts")
    monkeypatch.setattr(tts, "_sintetizar_gtts", gtts_ok)
    tts.sintetizar("x" * 10000)
    assert recebido["len"] == tts._MAX_TTS_CHARS
