from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles

from kardashev_analysis import sessions_store
from kardashev_analysis.filters import SessionFilters, matches, session_filters
from kardashev_analysis.stats import compute_stats


def create_app(data_dir, dist_dir=None):
    app = FastAPI()

    @app.get("/api/health")
    def health():
        return {"status": "ok", "session_count": sessions_store.count_sessions(data_dir)}

    @app.get("/api/sessions")
    def sessions(filters: SessionFilters = Depends(session_filters)):
        everything = sessions_store.load_sessions(data_dir)
        selected = [s.row() for s in everything if matches(s, filters)]
        return {"total_unfiltered": len(everything), "total": len(selected), "sessions": selected}

    @app.get("/api/stats")
    def stats(filters: SessionFilters = Depends(session_filters)):
        selected = [s for s in sessions_store.load_sessions(data_dir) if matches(s, filters)]
        return compute_stats(selected)

    # Mounted last so it never shadows /api routes.
    if dist_dir is not None and dist_dir.is_dir():
        app.mount("/", StaticFiles(directory=dist_dir, html=True))
    return app
