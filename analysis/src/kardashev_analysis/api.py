from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from kardashev_analysis import sessions_store


def create_app(data_dir, dist_dir=None):
    app = FastAPI()

    @app.get("/api/health")
    def health():
        return {"status": "ok", "session_count": sessions_store.count_sessions(data_dir)}

    # Mounted last so it never shadows /api routes.
    if dist_dir is not None and dist_dir.is_dir():
        app.mount("/", StaticFiles(directory=dist_dir, html=True))
    return app
