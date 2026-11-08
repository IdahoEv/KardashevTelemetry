from kardashev_collector.ratelimit import FixedWindowLimiter


class Clock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


def test_allows_up_to_limit_then_blocks():
    limiter = FixedWindowLimiter(limit=2, window_s=60, clock=Clock())
    assert limiter.allow("a")
    assert limiter.allow("a")
    assert not limiter.allow("a")


def test_keys_are_independent():
    limiter = FixedWindowLimiter(limit=1, window_s=60, clock=Clock())
    assert limiter.allow("a")
    assert limiter.allow("b")


def test_window_resets():
    clock = Clock()
    limiter = FixedWindowLimiter(limit=1, window_s=60, clock=clock)
    assert limiter.allow("a")
    assert not limiter.allow("a")
    clock.now = 61
    assert limiter.allow("a")


def test_expired_windows_are_pruned():
    clock = Clock()
    limiter = FixedWindowLimiter(limit=1, window_s=60, clock=clock)
    for i in range(100):
        limiter.allow(f"k{i}")
    clock.now = 120
    limiter.allow("fresh")
    assert limiter.tracked_keys() == 1
