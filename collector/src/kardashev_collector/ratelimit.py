import time


class FixedWindowLimiter:
    def __init__(self, limit, window_s, clock=time.monotonic):
        self._limit = limit
        self._window_s = window_s
        self._clock = clock
        self._windows = {}

    def allow(self, key):
        now = self._clock()
        self._prune(now)
        start, count = self._windows.get(key, (now, 0))
        if count >= self._limit:
            return False
        self._windows[key] = (start, count + 1)
        return True

    def tracked_keys(self):
        return len(self._windows)

    def _prune(self, now):
        expired = [k for k, (start, _) in self._windows.items() if now - start >= self._window_s]
        for key in expired:
            del self._windows[key]
