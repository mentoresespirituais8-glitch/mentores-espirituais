"""
Recuperação semântica (embeddings) multilingue, para substituir a heurística
de palavra-chave em service.py. Isto resolve um problema real encontrado ao
testar: fontes primárias em inglês (ex. cartas de Bezos) não eram
encontradas por perguntas feitas em português, porque não há sobreposição
de palavras exatas entre "contratam" e "hiring".

Usa fastembed (onnxruntime, sem depender de PyTorch) com um modelo sentence-
transformers multilingue — o mesmo texto em português e em inglês fica
próximo no espaço vetorial, o que permite uma pergunta em PT encontrar um
excerto em EN pelo significado, não pela palavra exata.

Modelo é carregado uma única vez (singleton) e fica em cache local em
~/.cache ou %TEMP%/fastembed_cache após o primeiro download (~470MB).
"""
from __future__ import annotations

import numpy as np

_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
_model = None
_load_failed = False


def _get_model():
    global _model, _load_failed
    if _model is not None or _load_failed:
        return _model
    try:
        from fastembed import TextEmbedding

        _model = TextEmbedding(model_name=_MODEL_NAME)
    except Exception:
        # Sem modelo disponível (ex. sem ligação à internet no primeiro
        # arranque, ou dependência em falta) — quem chamar isto deve cair
        # para a pesquisa por palavra-chave em vez de rebentar o pedido.
        _load_failed = True
        _model = None
    return _model


def is_available() -> bool:
    return _get_model() is not None


def embed(texts: list[str]) -> np.ndarray | None:
    model = _get_model()
    if model is None or not texts:
        return None
    return np.array(list(model.embed(texts)))


def cosine_similarities(query_vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    query_norm = query_vec / (np.linalg.norm(query_vec) + 1e-9)
    matrix_norms = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-9)
    return matrix_norms @ query_norm
