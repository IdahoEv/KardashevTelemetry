import duckdb

import kardashev_analysis


def test_package_imports():
    assert kardashev_analysis.__name__ == "kardashev_analysis"


def test_duckdb_runs():
    assert duckdb.connect().execute("select 1").fetchone() == (1,)
