"""
Root ASGI entrypoint for Render and production app runners.
Ensures backend package directory is on sys.path and exports the FastAPI app instance.
"""

import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app  # noqa: E402, F401

__all__ = ["app"]
