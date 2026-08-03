#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import os
import pathlib
import tempfile

MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "skills" / "macos-screen-recorder" / "scripts" / "macos-qa-capture.py"
spec = importlib.util.spec_from_file_location("macos_qa_capture", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def test_deep_merge() -> None:
    assert module.deep_merge(
        {"a": {"b": 1, "c": 2}, "x": [1]},
        {"a": {"b": 9}, "x": [2]},
    ) == {"a": {"b": 9, "c": 2}, "x": [2]}


def test_render_and_unresolved() -> None:
    assert module.render("{{a}}/{{b}}", {"a": "one", "b": "two"}) == "one/two"
    try:
        module.render("{{missing}}", {})
    except SystemExit:
        pass
    else:
        raise AssertionError("unresolved placeholder should fail")


def test_layered_config() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = pathlib.Path(td)
        (root / ".git").mkdir()
        user = root / "user.json"
        project = root / module.PROJECT_CONFIG
        local = root / module.PROJECT_LOCAL_CONFIG
        user.write_text(json.dumps({"a": {"one": 1, "two": 2}}))
        project.write_text(json.dumps({"a": {"two": 3}}))
        local.write_text(json.dumps({"b": True}))
        old = module.USER_CONFIG
        module.USER_CONFIG = user
        try:
            config, paths = module.load_config(root)
        finally:
            module.USER_CONFIG = old
        assert config == {"a": {"one": 1, "two": 3}, "b": True}
        assert [path.resolve() for path in paths] == [user.resolve(), project.resolve(), local.resolve()]


def test_safe_slug() -> None:
    assert module.safe_slug(" Demo / private? ") == "Demo-private"
    assert module.safe_slug("...") == "capture"


def main() -> None:
    tests = [test_deep_merge, test_render_and_unresolved, test_layered_config, test_safe_slug]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")


if __name__ == "__main__":
    main()
