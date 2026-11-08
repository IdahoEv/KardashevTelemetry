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


def test_expired_window_resets_even_before_prune_runs():
    clock = Clock()
    limiter = FixedWindowLimiter(limit=1, window_s=60, clock=clock)
    limiter.allow("a")
    clock.now = 30
    limiter.allow("b")
    clock.now = 61
    assert limiter.allow("a")


def test_concurrent_callers_never_exceed_limit():
    from concurrent.futures import ThreadPoolExecutor

    limiter = FixedWindowLimiter(limit=50, window_s=60)
    with ThreadPoolExecutor(16) as pool:
        results = list(pool.map(lambda i: limiter.allow("k"), range(500)))
    assert sum(results) == 50
