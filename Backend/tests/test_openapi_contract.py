import hashlib
import json
from pathlib import Path

from main import app


def test_openapi_contract_matches_pre_refactor_snapshot():
    document = app.openapi()
    contract = {
        "paths": document["paths"],
        "schemas": document.get("components", {}).get("schemas", {}),
        "securitySchemes": document.get("components", {}).get("securitySchemes", {}),
    }
    encoded = json.dumps(contract, sort_keys=True, separators=(",", ":")).encode()
    actual = hashlib.sha256(encoded).hexdigest()
    expected = Path("tests/fixtures/openapi_contract.sha256").read_text().strip()
    assert actual == expected
    assert len(document["paths"]) == 39


def test_historical_http_methods_are_preserved():
    paths = app.openapi()["paths"]
    assert "get" in paths["/album/edit/{album_id}"]
    assert "get" in paths["/foto/tambah/{album_id}"]
    assert "post" in paths["/acara/edit/{acara_id}"]
