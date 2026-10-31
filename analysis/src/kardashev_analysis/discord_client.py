import json
import time
import urllib.error
import urllib.request

API = "https://discord.com/api/v10"
MAX_RETRIES = 5


class DiscordError(RuntimeError):
    pass


def urllib_http(url, headers):
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, dict(response.headers), response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, dict(exc.headers), exc.read()


class DiscordClient:
    def __init__(self, token, http=urllib_http, page_size=100, sleep=time.sleep):
        self._token = token
        self._http = http
        self._page_size = page_size
        self._sleep = sleep

    def _get(self, url, headers):
        for _ in range(MAX_RETRIES):
            status, response_headers, body = self._http(url, headers)
            if status != 429:
                break
            retry_after = {k.lower(): v for k, v in response_headers.items()}.get("retry-after", 1)
            self._sleep(float(retry_after))
        if status != 200:
            raise DiscordError(f"GET {url} failed with status {status}")
        return body

    def list_messages(self, channel_id, after=None):
        """Yield messages oldest-first, paging forward from the `after` message id."""
        cursor = after
        while True:
            url = f"{API}/channels/{channel_id}/messages?limit={self._page_size}"
            if cursor:
                url += f"&after={cursor}"
            body = self._get(url, {"Authorization": f"Bot {self._token}"})
            page = sorted(json.loads(body), key=lambda m: int(m["id"]))
            yield from page
            if len(page) < self._page_size:
                return
            cursor = page[-1]["id"]

    def download(self, url):
        return self._get(url, {})
