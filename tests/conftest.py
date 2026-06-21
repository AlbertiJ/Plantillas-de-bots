"""
============================================
tests/conftest.py — Fixtures globales
============================================

Este archivo se importa automaticamente por pytest antes que cualquier
test. Lo usamos para:
  - Resetear el state del rate limiter entre tests
"""
import pytest


@pytest.fixture(autouse=True)
def _reset_rate_limit_between_tests():
    """
    Limpia el state global del rate limiter antes de cada test.
    Sin esto, los tests que hacen login muchas veces se chocan con
    el 429 (5/min por IP) que el rate limiter impone.
    """
    from app import ratelimit
    ratelimit.reset_rate_limit()
    yield
    ratelimit.reset_rate_limit()
