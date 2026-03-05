from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    api_key: str = os.getenv("AI_AGENT_DEMO_API_KEY", "dev-api-key")
    jwt_secret: str = os.getenv("AI_AGENT_DEMO_JWT_SECRET", "dev-jwt-secret")
    rate_limit_per_minute: int = int(os.getenv("AI_AGENT_DEMO_RATE_LIMIT", "120"))
    otel_enabled: bool = os.getenv("AI_AGENT_DEMO_OTEL_ENABLED", "1") == "1"


settings = Settings()
