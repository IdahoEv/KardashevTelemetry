import os

from kardashev_collector.app import create_app
from kardashev_collector.config import Settings
from kardashev_collector.signing import GcsPolicySigner


def build_app():
    settings = Settings.from_env(os.environ)
    return create_app(settings, GcsPolicySigner(settings.bucket))
