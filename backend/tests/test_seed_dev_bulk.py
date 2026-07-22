import importlib.util
from pathlib import Path


SEED_SCRIPT = Path(__file__).parents[1] / "scripts" / "seed_dev_bulk.py"


def _load_seed_module():
    spec = importlib.util.spec_from_file_location("seed_dev_bulk", SEED_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_voucher_fixture_url_uses_reachable_default(monkeypatch):
    monkeypatch.delenv("SEED_VOUCHER_BASE_URL", raising=False)

    assert _load_seed_module().voucher_fixture_url() == "https://placehold.co/600x400.png?text=Cata+Club+Voucher"


def test_voucher_fixture_url_uses_configured_url(monkeypatch):
    monkeypatch.setenv("SEED_VOUCHER_BASE_URL", "https://fixtures.example/voucher.png")

    assert _load_seed_module().voucher_fixture_url() == "https://fixtures.example/voucher.png"


def test_voucher_fixture_url_falls_back_when_configuration_is_blank(monkeypatch):
    monkeypatch.setenv("SEED_VOUCHER_BASE_URL", "")

    assert _load_seed_module().voucher_fixture_url() == "https://placehold.co/600x400.png?text=Cata+Club+Voucher"
