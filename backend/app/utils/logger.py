"""
Structured logger — uses stdlib logging, level from LOG_LEVEL env var.
"""

import logging
import sys

from backend.app.config import settings


def get_logger(name: str) -> logging.Logger:
    """Return a logger configured with the application log level."""
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    return logger
