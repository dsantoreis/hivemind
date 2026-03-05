from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException

from .config import settings


class InMemoryRateLimiter:
    def __init__(self, max_per_minute: int) -> None:
        self.max_per_minute = max_per_minute
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def check(self, identity: str) -> None:
        now = time.time()
        cutoff = now - 60
        with self._lock:
            q = self._hits[identity]
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= self.max_per_minute:
                raise HTTPException(status_code=429, detail="rate_limit_exceeded")
            q.append(now)


rate_limiter = InMemoryRateLimiter(settings.rate_limit_per_minute)
