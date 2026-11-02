from typing import Annotated, Literal

from fastapi import Query
from pydantic import BaseModel, Field


class SessionFilters(BaseModel):
    dev: Literal["exclude", "include", "only"] = "exclude"
    name: str | None = None
    build: list[str] = Field(default_factory=list)
    reached: list[str] = Field(default_factory=list)


def session_filters(
    dev: Literal["exclude", "include", "only"] = "exclude",
    name: str | None = None,
    build: Annotated[list[str], Query()] = [],
    reached: Annotated[list[str], Query()] = [],
) -> SessionFilters:
    # An empty repeated param (?build=) arrives as [""], which would match nothing.
    return SessionFilters(
        dev=dev,
        name=name,
        build=[v for v in build if v],
        reached=[v for v in reached if v],
    )


def matches(session, filters):
    return (
        _dev_matches(session.dev, filters.dev)
        and _name_matches(session.player_name, filters.name)
        and _build_matches(session, filters.build)
        and set(filters.reached) <= set(session.goals)
    )


def _dev_matches(is_dev, mode):
    return mode == "include" or is_dev == (mode == "only")


def _name_matches(player_name, needle):
    if not needle:
        return True
    return player_name is not None and needle.lower() in player_name.lower()


def _build_matches(session, builds):
    return not builds or bool({session.build_version, session.build_commit} & set(builds))
