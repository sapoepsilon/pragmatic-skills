#!/usr/bin/env python3
"""Privacy-safe macOS QA capture helper.

This helper deliberately delegates GUI capture/install to user-configured command
strings that talk to a LaunchAgent in the logged-in Aqua session. It never embeds
storage, signing, application, or account identifiers.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import plistlib
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Any


CONFIG_HOME = pathlib.Path(os.environ.get("XDG_CONFIG_HOME", pathlib.Path.home() / ".config"))
USER_CONFIG = CONFIG_HOME / "macos-qa-capture" / "config.json"
PROJECT_CONFIG = ".macos-qa-capture.json"
PROJECT_LOCAL_CONFIG = ".macos-qa-capture.local.json"
STATE_FILE = pathlib.Path(tempfile.gettempdir()) / f"macos-qa-capture-state-{os.getuid()}.json"


def fail(message: str, code: int = 1) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(code)


def expand(value: str) -> str:
    return os.path.expandvars(os.path.expanduser(value))


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    result = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def find_repo_root(start: pathlib.Path) -> pathlib.Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".git").exists():
            return candidate
    return current


def read_json(path: pathlib.Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot read JSON config {path}: {exc}")
    if not isinstance(data, dict):
        fail(f"config must contain a JSON object: {path}")
    return data


def load_config(cwd: pathlib.Path | None = None) -> tuple[dict[str, Any], list[pathlib.Path]]:
    root = find_repo_root(cwd or pathlib.Path.cwd())
    paths = [USER_CONFIG, root / PROJECT_CONFIG, root / PROJECT_LOCAL_CONFIG]
    config: dict[str, Any] = {}
    loaded: list[pathlib.Path] = []
    for path in paths:
        if path.exists():
            config = deep_merge(config, read_json(path))
            loaded.append(path)
    if not loaded:
        fail(f"no config found; run setup.sh to create {USER_CONFIG}")
    return config, loaded


def get(config: dict[str, Any], dotted: str, default: Any = None) -> Any:
    value: Any = config
    for key in dotted.split("."):
        if not isinstance(value, dict) or key not in value:
            return default
        value = value[key]
    return value


def write_json_atomic(path: pathlib.Path, data: dict[str, Any], mode: int = 0o600) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\n")
        os.chmod(tmp, mode)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def safe_slug(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-.")
    return slug or "capture"


def placeholders(config: dict[str, Any], **extra: str) -> dict[str, str]:
    artifact_dir = expand(str(get(config, "artifacts.directory", "~/qa-artifacts/macos")))
    mapping = {
        "requestDir": expand(str(get(config, "gui.requestDir", ""))),
        "responseDir": expand(str(get(config, "gui.responseDir", ""))),
        "installSpec": str(get(config, "install.spec", "")),
        "appName": str(get(config, "app.name", "")),
        "bundlePath": expand(str(get(config, "app.bundlePath", ""))),
        "expiry": str(get(config, "storage.expiry", "167h")),
        "artifactDir": artifact_dir,
        "date": time.strftime("%Y-%m-%d"),
    }
    mapping.update({key: str(value) for key, value in extra.items()})
    if mapping.get("file"):
        mapping["basename"] = pathlib.Path(mapping["file"]).name
    return mapping


def render(template: str, mapping: dict[str, str]) -> str:
    rendered = template
    for key, value in mapping.items():
        rendered = rendered.replace("{{" + key + "}}", value)
    unresolved = sorted(set(re.findall(r"{{([A-Za-z0-9_]+)}}", rendered)))
    if unresolved:
        fail(f"unresolved command placeholders: {', '.join(unresolved)}")
    return rendered


def run_shell(template: str, mapping: dict[str, str], capture: bool = True) -> str:
    if not template.strip():
        fail("required command template is not configured")
    command = render(template, mapping)
    result = subprocess.run(
        ["/bin/bash", "-lc", command],
        text=True,
        capture_output=capture,
        check=False,
    )
    if result.returncode:
        detail = (result.stderr or result.stdout or "command failed").strip()
        fail(detail)
    return result.stdout.strip() if capture else ""


def config_summary(config: dict[str, Any], paths: list[pathlib.Path]) -> None:
    summary = {
        "loaded": [str(path) for path in paths],
        "app": {
            "name": get(config, "app.name", ""),
            "bundlePath": get(config, "app.bundlePath", ""),
            "bundleIdConfigured": bool(get(config, "signing.expectedBundleId", "")),
        },
        "gui": {
            "requestDir": get(config, "gui.requestDir", ""),
            "responseDir": get(config, "gui.responseDir", ""),
            "installConfigured": bool(get(config, "gui.commands.install", "")),
            "screenshotConfigured": bool(get(config, "gui.commands.screenshot", "")),
            "startConfigured": bool(get(config, "gui.commands.start", "")),
            "stopConfigured": bool(get(config, "gui.commands.stop", "")),
        },
        "storage": {
            "uploadConfigured": bool(get(config, "storage.uploadCommand", "")),
            "linkConfigured": bool(get(config, "storage.linkCommand", "")),
            "expiry": get(config, "storage.expiry", ""),
        },
    }
    print(json.dumps(summary, indent=2))


def preflight(config: dict[str, Any]) -> None:
    errors: list[str] = []
    warnings: list[str] = []
    if sys.platform != "darwin":
        errors.append("capture orchestration must run on macOS")
    for command in ("python3", "osascript", "codesign", "defaults"):
        if shutil.which(command) is None:
            errors.append(f"missing command: {command}")
    for dotted in ("gui.requestDir", "gui.responseDir", "app.name", "app.bundlePath"):
        if not str(get(config, dotted, "")).strip():
            errors.append(f"missing config: {dotted}")
    for action in ("install", "screenshot", "start", "stop"):
        if not str(get(config, f"gui.commands.{action}", "")).strip():
            errors.append(f"missing GUI command template: gui.commands.{action}")
    if bool(get(config, "staging.enableDoNotDisturb", True)):
        if not str(get(config, "staging.focusEnableCommand", "")).strip():
            errors.append("staging.enableDoNotDisturb requires staging.focusEnableCommand")
        if not str(get(config, "staging.focusRestoreCommand", "")).strip():
            warnings.append("staging.focusRestoreCommand is empty; pre-existing Focus state cannot be restored automatically")
    for dotted in ("gui.requestDir", "gui.responseDir", "artifacts.directory"):
        raw = str(get(config, dotted, ""))
        if not raw:
            continue
        path = pathlib.Path(expand(raw))
        try:
            path.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            errors.append(f"cannot create {dotted} at {path}: {exc}")
            continue
        if not os.access(path, os.W_OK):
            errors.append(f"not writable: {path}")
    if not get(config, "storage.uploadCommand", ""):
        warnings.append("remote storage is not configured; approved artifacts will remain local")
    if not get(config, "storage.linkCommand", ""):
        warnings.append("presigned/share link command is not configured")
    bundle = pathlib.Path(expand(str(get(config, "app.bundlePath", ""))))
    if not bundle.exists():
        warnings.append(f"installed app does not currently exist: {bundle}")
    if int(get(config, "install.maxAttempts", 1) or 1) > 2:
        errors.append("install.maxAttempts must be 1 or 2 to prevent Keychain prompt storms")
    for warning in warnings:
        print(f"warning: {warning}")
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
    print("preflight passed")


def install(config: dict[str, Any]) -> None:
    attempts = int(get(config, "install.maxAttempts", 1) or 1)
    if attempts > 2:
        fail("refusing more than two install attempts")
    template = str(get(config, "gui.commands.install", ""))
    last_error = ""
    for attempt in range(1, attempts + 1):
        try:
            output = run_shell(template, placeholders(config))
            print(output or "install request completed")
            return
        except SystemExit as exc:
            last_error = str(exc)
            if attempt >= attempts:
                raise
            print("install attempt failed; retry only because local config explicitly permits one bounded retry", file=sys.stderr)
    fail(last_error or "install failed")


def codesign_info(bundle: pathlib.Path) -> str:
    result = subprocess.run(
        ["codesign", "-dv", "--verbose=4", str(bundle)],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if result.returncode:
        fail(result.stdout.strip() or "cannot inspect code signature")
    return result.stdout


def verify_signature(config: dict[str, Any]) -> None:
    bundle = pathlib.Path(expand(str(get(config, "app.bundlePath", ""))))
    if not bundle.exists():
        fail(f"installed app not found: {bundle}")
    verify = subprocess.run(
        ["codesign", "--verify", "--deep", "--strict", "--verbose=2", str(bundle)],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if verify.returncode:
        fail(verify.stdout.strip() or "strict signature verification failed")
    info = codesign_info(bundle)
    expected_bundle = str(get(config, "signing.expectedBundleId", "")).strip()
    expected_team = str(get(config, "signing.expectedTeamId", "")).strip()
    expected_authority = str(get(config, "signing.expectedAuthorityContains", "")).strip()
    if expected_bundle and f"Identifier={expected_bundle}" not in info:
        fail("installed bundle identifier does not match local expectation")
    if expected_team and f"TeamIdentifier={expected_team}" not in info:
        fail("installed signing team does not match local expectation")
    if expected_authority and expected_authority not in info:
        fail("installed signing authority does not match local expectation")
    print("strict signature verification passed")


def read_defaults(domain: str, key: str) -> tuple[bool, Any]:
    result = subprocess.run(
        ["defaults", "export", domain, "-"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if result.returncode:
        return False, None
    try:
        data = plistlib.loads(result.stdout)
    except Exception:
        return False, None
    if key not in data:
        return False, None
    return True, data[key]


def write_default(domain: str, key: str, value: Any) -> None:
    if isinstance(value, bool):
        args = ["-bool", "true" if value else "false"]
    elif isinstance(value, int):
        args = ["-int", str(value)]
    elif isinstance(value, float):
        args = ["-float", str(value)]
    else:
        args = ["-string", str(value)]
    subprocess.run(["defaults", "write", domain, key, *args], check=False)


def delete_default(domain: str, key: str) -> None:
    subprocess.run(["defaults", "delete", domain, key], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)


def osa(script: str) -> None:
    subprocess.run(["osascript", "-e", script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)


def stage(config: dict[str, Any]) -> None:
    if STATE_FILE.exists():
        fail(f"desktop staging state already exists: {STATE_FILE}; run restore first")
    preferences = []
    if bool(get(config, "staging.hideDesktopIcons", True)):
        preferences.append(("com.apple.finder", "CreateDesktop", False))
    if bool(get(config, "staging.hideWidgets", True)):
        preferences.extend([
            ("com.apple.WindowManager", "StandardHideWidgets", True),
            ("com.apple.WindowManager", "StageManagerHideWidgets", True),
        ])
    state: dict[str, Any] = {"preferences": [], "focus": None}
    for domain, key, staged_value in preferences:
        existed, old_value = read_defaults(domain, key)
        state["preferences"].append({"domain": domain, "key": key, "existed": existed, "value": old_value})
        write_default(domain, key, staged_value)
    write_json_atomic(STATE_FILE, state)
    if bool(get(config, "staging.enableDoNotDisturb", True)):
        focus_enable = str(get(config, "staging.focusEnableCommand", "")).strip()
        focus_restore = str(get(config, "staging.focusRestoreCommand", "")).strip()
        if not focus_enable:
            restore()
            fail("staging.enableDoNotDisturb is true but staging.focusEnableCommand is not configured")
        result = subprocess.run(
            ["/bin/bash", "-lc", focus_enable],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        if result.returncode:
            restore()
            fail(result.stderr.strip() or "notification-suppression command failed")
        state["focus"] = {"enabled": True, "restoreCommand": focus_restore}
        write_json_atomic(STATE_FILE, state)
    target = str(get(config, "staging.targetApp", get(config, "app.name", "")))
    keep = {target, "Finder", "Dock", "SystemUIServer", "WindowManager", "ControlCenter", "NotificationCenter"}
    for app in get(config, "staging.quitApps", []) or []:
        if app and app not in keep:
            osa(f'tell application {json.dumps(str(app))} to quit')
    for app in get(config, "staging.hideApps", []) or []:
        if app and app not in keep:
            osa(f'tell application "System Events" to set visible of process {json.dumps(str(app))} to false')
    if target:
        script = (
            'tell application "System Events"\n'
            'repeat with p in (every application process whose visible is true)\n'
            'set n to name of p\n'
            f'if n is not {json.dumps(target)} and n is not "Finder" then set visible of p to false\n'
            'end repeat\nend tell'
        )
        osa(script)
    write_json_atomic(STATE_FILE, state)
    subprocess.run(["killall", "Finder"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    print(f"desktop staged; saved exact restore state at {STATE_FILE}")


def restore() -> None:
    if not STATE_FILE.exists():
        print("no saved desktop state; nothing to restore")
        return
    state = read_json(STATE_FILE)
    for item in state.get("preferences", []):
        domain, key = str(item["domain"]), str(item["key"])
        if item.get("existed"):
            write_default(domain, key, item.get("value"))
        else:
            delete_default(domain, key)
    focus = state.get("focus") or {}
    restore_command = str(focus.get("restoreCommand", "")).strip()
    if focus.get("enabled") and restore_command:
        subprocess.run(
            ["/bin/bash", "-lc", restore_command],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    subprocess.run(["killall", "Finder"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    STATE_FILE.unlink(missing_ok=True)
    print("desktop preferences restored")


def artifact_path(config: dict[str, Any], slug: str, suffix: str) -> pathlib.Path:
    directory = pathlib.Path(expand(str(get(config, "artifacts.directory", "~/qa-artifacts/macos"))))
    directory.mkdir(parents=True, exist_ok=True)
    return directory / f"{safe_slug(slug)}{suffix}"


def gui_action(config: dict[str, Any], action: str, slug: str, output: pathlib.Path) -> pathlib.Path:
    template = str(get(config, f"gui.commands.{action}", ""))
    mapping = placeholders(config, slug=safe_slug(slug), output=str(output))
    stdout = run_shell(template, mapping)
    candidate = pathlib.Path(expand(stdout.splitlines()[-1])) if stdout.strip() else output
    timeout = int(get(config, "gui.timeoutSeconds", 180) or 180)
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if candidate.exists() and candidate.stat().st_size > 0:
            print(candidate)
            return candidate
        time.sleep(1)
    fail(f"{action} request did not produce a non-empty artifact within {timeout}s: {candidate}")


def screenshot(config: dict[str, Any], slug: str) -> None:
    output = artifact_path(config, slug, ".png")
    gui_action(config, "screenshot", slug, output)


def start(config: dict[str, Any], slug: str) -> None:
    output = artifact_path(config, slug, ".mov")
    template = str(get(config, "gui.commands.start", ""))
    stdout = run_shell(template, placeholders(config, slug=safe_slug(slug), output=str(output)))
    print(stdout or f"recording requested: {output}")


def stop(config: dict[str, Any], slug: str) -> None:
    output = artifact_path(config, slug, ".mov")
    gui_action(config, "stop", slug, output)


def contact_sheet(config: dict[str, Any], video: pathlib.Path) -> None:
    if not video.exists() or video.stat().st_size == 0:
        fail(f"video is missing or empty: {video}")
    output = video.with_name(video.stem + "-contact-sheet.jpg")
    template = str(get(config, "artifacts.contactSheetCommand", "")).strip()
    samples = max(4, int(get(config, "artifacts.contactSheetSamples", 12) or 12))
    if template:
        stdout = run_shell(template, placeholders(config, file=str(video), output=str(output), samples=str(samples)))
        candidate = pathlib.Path(expand(stdout.splitlines()[-1])) if stdout.strip() else output
    else:
        if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
            fail("contactSheetCommand is not configured and ffmpeg/ffprobe are unavailable")
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(video)],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if probe.returncode:
            fail(probe.stderr.strip() or "ffprobe could not read the video")
        duration = float(probe.stdout.strip())
        interval = max(duration / samples, 0.25)
        cols = 4
        rows = (samples + cols - 1) // cols
        vf = f"fps=1/{interval},scale=480:-1,tile={cols}x{rows}:padding=6:margin=6"
        result = subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-frames:v", "1", "-vf", vf, str(output)],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if result.returncode:
            fail(result.stderr.strip() or "ffmpeg contact sheet generation failed")
        candidate = output
    if not candidate.exists() or candidate.stat().st_size == 0:
        fail(f"contact sheet was not produced: {candidate}")
    print(candidate)


def upload(config: dict[str, Any], file: pathlib.Path) -> None:
    if not file.exists() or file.stat().st_size == 0:
        fail(f"reviewed artifact is missing or empty: {file}")
    upload_template = str(get(config, "storage.uploadCommand", "")).strip()
    link_template = str(get(config, "storage.linkCommand", "")).strip()
    destination_template = str(get(config, "storage.destinationTemplate", "")).strip()
    if not upload_template or not link_template or not destination_template:
        fail("remote storage is not configured; keep the approved artifact local")
    base = placeholders(config, file=str(file))
    destination = render(destination_template, base)
    mapping = {**base, "destination": destination}
    run_shell(upload_template, mapping)
    link = run_shell(link_template, mapping)
    if not link:
        fail("link command returned an empty result")
    print(link.splitlines()[-1])


def main() -> None:
    parser = argparse.ArgumentParser(description="Privacy-safe macOS QA capture helper")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("config")
    sub.add_parser("preflight")
    sub.add_parser("install")
    sub.add_parser("verify-signature")
    sub.add_parser("stage")
    sub.add_parser("restore")
    shot = sub.add_parser("screenshot")
    shot.add_argument("slug", nargs="?", default="staging")
    start_p = sub.add_parser("start")
    start_p.add_argument("slug", nargs="?", default="demo")
    stop_p = sub.add_parser("stop")
    stop_p.add_argument("slug", nargs="?", default="demo")
    sheet = sub.add_parser("contact-sheet")
    sheet.add_argument("video")
    upload_p = sub.add_parser("upload")
    upload_p.add_argument("file")
    args = parser.parse_args()

    if args.command == "restore":
        restore()
        return
    config, paths = load_config()
    if args.command == "config":
        config_summary(config, paths)
    elif args.command == "preflight":
        preflight(config)
    elif args.command == "install":
        install(config)
    elif args.command == "verify-signature":
        verify_signature(config)
    elif args.command == "stage":
        stage(config)
    elif args.command == "screenshot":
        screenshot(config, args.slug)
    elif args.command == "start":
        start(config, args.slug)
    elif args.command == "stop":
        stop(config, args.slug)
    elif args.command == "contact-sheet":
        contact_sheet(config, pathlib.Path(expand(args.video)))
    elif args.command == "upload":
        upload(config, pathlib.Path(expand(args.file)))


if __name__ == "__main__":
    main()
