"""
============================================
app/ratelimit.py — Rate limiter en memoria
============================================

Implementacion simple de sliding window por clave (IP o user).
- En memoria (proceso): suficiente para single-process apps
- Lock por bucket para concurrencia
- Si se quiere escalar: reemplazar dict por Redis (mismo interfaz)

Uso:
    from app.ratelimit import rate_limit, RateLimitExceeded

    @rate_limit("login", max_requests=5, window_s=60)
    async def login(req: Request, ...):
        ...

    try:
        check_rate_limit("login", ip, max_requests=5, window_s=60)
    except RateLimitExceeded as e:
        raise HTTPException(429, detail=str(e))
"""

import threading
import time
from collections import defaultdict, deque
from typing import Optional

from fastapi import HTTPException, Request

# Estado global del rate limiter (en memoria, por proceso)
_BUCKETS: dict[str, deque] = defaultdict(deque)
_LOCK = threading.Lock()


class RateLimitExceeded(Exception):
    """Levantada cuando se supera el max de requests en la ventana."""

    def __init__(self, key: str, max_requests: int, window_s: int, retry_after_s: float):
        self.key = key
        self.max_requests = max_requests
        self.window_s = window_s
        self.retry_after_s = retry_after_s
        super().__init__(
            f"Rate limit excedido para {key}: {max_requests} req / {window_s}s. "
            f"Reintentar en {retry_after_s:.1f}s"
        )


def _client_ip(request: Request) -> str:
    """Obtiene la IP del cliente, considerando X-Forwarded-For si hay proxy."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(
    key: str,
    max_requests: int,
    window_s: int,
    now: Optional[float] = None,
) -> None:
    """
    Verifica y registra un request. Si supera el limite, levanta RateLimitExceeded.

    key: identificador del bucket (ej: "login:127.0.0.1", "launcher:admin")
    max_requests: maximo de requests permitidos en la ventana
    window_s: tamano de la ventana en segundos
    now: timestamp actual (para tests), defaults a time.time()
    """
    now = now if now is not None else time.time()
    cutoff = now - window_s
    with _LOCK:
        bucket = _BUCKETS[key]
        # Sacar los timestamps fuera de la ventana
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= max_requests:
            # Calcular retry_after basado en el mas viejo
            oldest = bucket[0]
            retry_after = max(0.1, window_s - (now - oldest))
            raise RateLimitExceeded(key, max_requests, window_s, retry_after)
        bucket.append(now)


def reset_rate_limit(key: Optional[str] = None) -> None:
    """
    Limpia el state del rate limiter. Usado en tests.
    Si key es None, limpia todo.
    """
    with _LOCK:
        if key is None:
            _BUCKETS.clear()
        else:
            _BUCKETS.pop(key, None)


def rate_limit_for_login(request: Request, max_requests: int = 5, window_s: int = 60) -> None:
    """Rate limit por IP, pensado para /api/auth/login."""
    key = f"login:{_client_ip(request)}"
    try:
        check_rate_limit(key, max_requests, window_s)
    except RateLimitExceeded as e:
        raise HTTPException(
            status_code=429,
            detail=str(e),
            headers={"Retry-After": str(int(e.retry_after_s) + 1)},
        )


def rate_limit_for_launcher(request: Request, max_requests: int = 10, window_s: int = 60) -> None:
    """Rate limit por usuario, pensado para /api/launcher/run."""
    from app.auth import SESSION_TOKEN_COOKIE, _parse_session_token

    token = request.cookies.get(SESSION_TOKEN_COOKIE, "anonymous")
    username = _parse_session_token(token) or "anonymous"
    key = f"launcher:{username}:{_client_ip(request)}"
    try:
        check_rate_limit(key, max_requests, window_s)
    except RateLimitExceeded as e:
        raise HTTPException(
            status_code=429,
            detail=str(e),
            headers={"Retry-After": str(int(e.retry_after_s) + 1)},
        )
