#!/usr/bin/env python3
"""Deterministic checks for the vibe-sober-up project-memory harness."""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from typing import Iterable


ROOT_DOCS = (
    "AGENTS.md",
    "PRD.md",
    "ARCHITECTURE.md",
    "DATABASE.md",
    "DESIGN.md",
    "TASKS.md",
    "PROGRESS.md",
    "LEARNINGS.md",
    "DECISIONS.md",
    "CHANGELOG.md",
)
CLAUDE_HOOK_COMMAND = (
    'python3 "$CLAUDE_PROJECT_DIR/.vibe/vibe_doctor.py" claude-hook'
)
CLAUDE_TRACK_COMMAND = (
    'python3 "$CLAUDE_PROJECT_DIR/.vibe/vibe_doctor.py" claude-track'
)
ID_BODY = r"(?:(?:REQ|TASK|VER|ARC|DB|UI)-[A-Z0-9][A-Z0-9-]*-\d{3}|DEC-\d{3,})"
ID_PATTERN = re.compile(rf"\b{ID_BODY}\b")
ID_DEFINITION_PATTERNS = (
    re.compile(rf"^\s*#{{1,6}}\s+({ID_BODY})\b"),
    re.compile(rf"^\s*-\s*(?:\[[ xX]\]\s*)?({ID_BODY})\b"),
    re.compile(rf"^\s*\|\s*({ID_BODY})\s*\|"),
    re.compile(rf"^\s*id\s*[:：]\s*({ID_BODY})\b", re.IGNORECASE),
)
LINK_PATTERN = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
SECRET_PATTERNS = (
    re.compile(
        r"""(?ix)
        \b(password|passwd|token|secret|api[_-]?key)\s*[:=]\s*
        ["']([^"'\n]{8,})["']
        """
    ),
    re.compile(r"\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
)
PLACEHOLDER_VALUES = {
    "redacted",
    "replace-me",
    "replace_me",
    "changeme",
    "example",
    "待确认",
}
VALIDITY_PATTERN = re.compile(
    r"""(?x)
    <!--\s*vibe-memory:\s*
    status=(proposed|accepted|verified|deprecated);\s*
    verified_at=([^;]+);\s*
    verified_commit=([^;]+);\s*
    owner=([^\s>]+)\s*-->
    """
)
MEMORY_LINE_BUDGETS = {
    "AGENTS.md": 220,
    "PRD.md": 600,
    "ARCHITECTURE.md": 600,
    "DATABASE.md": 600,
    "DESIGN.md": 600,
    "TASKS.md": 400,
    "PROGRESS.md": 160,
    "LEARNINGS.md": 500,
    "DECISIONS.md": 500,
    "CHANGELOG.md": 500,
}
AGENTS_FORBIDDEN_HEADINGS = {
    "prd",
    "产品需求",
    "architecture",
    "架构",
    "database",
    "数据库",
    "design",
    "设计规范",
    "tasks",
    "任务",
    "progress",
    "进度",
    "decisions",
    "决策记录",
    "learnings",
    "经验记录",
    "changelog",
    "变更记录",
}
DOMAIN_DOCS = {
    "design": "DESIGN.md",
    "database": "DATABASE.md",
    "architecture": "ARCHITECTURE.md",
}


@dataclass(frozen=True)
class Finding:
    severity: str
    code: str
    message: str
    path: str | None = None
    line: int | None = None

    def to_dict(self) -> dict[str, object]:
        return {key: value for key, value in asdict(self).items() if value is not None}


def _relative(path: Path, project: Path) -> str:
    try:
        return path.relative_to(project).as_posix()
    except ValueError:
        return str(path)


def _memory_files(project: Path) -> list[Path]:
    files = [project / name for name in (*ROOT_DOCS, "CLAUDE.md") if (project / name).is_file()]
    specs = project / "specs"
    if specs.is_dir():
        files.extend(sorted(specs.rglob("*.md")))
    return files


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _check_required_docs(project: Path, strict: bool) -> list[Finding]:
    severity = "error" if strict else "warning"
    return [
        Finding(
            severity,
            "MEMORY_DOC_MISSING",
            f"Standard project-memory file is missing: {name}",
            name,
        )
        for name in ROOT_DOCS
        if not (project / name).is_file()
    ]


def _check_validity_metadata(
    project: Path, files: Iterable[Path], strict: bool
) -> list[Finding]:
    severity = "error" if strict else "warning"
    findings: list[Finding] = []
    for path in files:
        if path.name in {"AGENTS.md", "CLAUDE.md"}:
            continue
        text = _read(path)
        if "vibe-memory:" not in text:
            findings.append(
                Finding(
                    severity,
                    "VALIDITY_METADATA_MISSING",
                    "Canonical memory needs status, verified_at, verified_commit, and owner metadata.",
                    _relative(path, project),
                )
            )
        elif not VALIDITY_PATTERN.search(text):
            findings.append(
                Finding(
                    severity,
                    "VALIDITY_METADATA_INVALID",
                    "The vibe-memory metadata line is malformed.",
                    _relative(path, project),
                )
            )
    return findings


def _check_memory_bloat(project: Path) -> list[Finding]:
    findings: list[Finding] = []
    for name, budget in MEMORY_LINE_BUDGETS.items():
        path = project / name
        if not path.is_file():
            continue
        line_count = len(_read(path).splitlines())
        if line_count > budget:
            findings.append(
                Finding(
                    "warning",
                    "MEMORY_BLOAT",
                    f"{name} has {line_count} lines; compact or archive stale detail (budget {budget}).",
                    name,
                )
            )
        if line_count > int(budget * 1.5):
            findings.append(
                Finding(
                    "error",
                    "MEMORY_GC_REQUIRED",
                    f"{name} exceeds the hard limit; compact or archive stale memory before completion.",
                    name,
                )
            )
    return findings


def _check_agents_router(project: Path) -> list[Finding]:
    path = project / "AGENTS.md"
    if not path.is_file():
        return []
    findings: list[Finding] = []
    for number, line in enumerate(_read(path).splitlines(), 1):
        match = re.match(r"^#{1,2}\s+(.+?)\s*$", line)
        if not match:
            continue
        heading = match.group(1).strip().casefold()
        if heading in AGENTS_FORBIDDEN_HEADINGS:
            findings.append(
                Finding(
                    "error",
                    "AGENTS_NOT_ROUTER",
                    "AGENTS.md may route to this domain but must not own its facts.",
                    "AGENTS.md",
                    number,
                )
            )
    return findings


def _first_non_empty_line(text: str) -> tuple[int, str] | None:
    for number, line in enumerate(text.splitlines(), 1):
        if line.strip():
            return number, line.strip()
    return None


def _check_claude_bridge(project: Path) -> list[Finding]:
    claude = project / "CLAUDE.md"
    if not claude.is_file():
        return []
    first = _first_non_empty_line(_read(claude))
    if first and first[1] == "@AGENTS.md":
        return []
    line = first[0] if first else 1
    return [
        Finding(
            "error",
            "CLAUDE_BRIDGE_INVALID",
            "The first non-empty CLAUDE.md line must be @AGENTS.md.",
            "CLAUDE.md",
            line,
        )
    ]


def _check_duplicate_headings(project: Path, files: Iterable[Path]) -> list[Finding]:
    findings: list[Finding] = []
    for path in files:
        seen: dict[str, int] = {}
        for number, line in enumerate(_read(path).splitlines(), 1):
            match = re.match(r"^#\s+(.+?)\s*$", line)
            if not match:
                continue
            heading = match.group(1).casefold()
            if heading in seen:
                findings.append(
                    Finding(
                        "warning",
                        "DUPLICATE_TOP_HEADING",
                        f"Duplicate top-level heading; first seen on line {seen[heading]}.",
                        _relative(path, project),
                        number,
                    )
                )
            else:
                seen[heading] = number
    return findings


def _check_ids(project: Path, files: Iterable[Path]) -> list[Finding]:
    findings: list[Finding] = []
    seen: dict[str, tuple[str, int]] = {}
    for path in files:
        relative = _relative(path, project)
        for number, line in enumerate(_read(path).splitlines(), 1):
            definitions = [
                match.group(1)
                for pattern in ID_DEFINITION_PATTERNS
                if (match := pattern.search(line))
            ]
            for identifier in definitions:
                if identifier in seen:
                    first_path, first_line = seen[identifier]
                    findings.append(
                        Finding(
                            "error",
                            "DUPLICATE_ID",
                            f"{identifier} duplicates {first_path}:{first_line}.",
                            relative,
                            number,
                        )
                    )
                else:
                    seen[identifier] = (relative, number)
    return findings


def _check_links(project: Path, files: Iterable[Path]) -> list[Finding]:
    findings: list[Finding] = []
    # Fenced code blocks (``` or ~~~) are not Markdown; skip link scanning
    # inside them so computed-call syntax like console[type](arg) is not
    # misread as a [text](target) link.
    fence_re = re.compile(r"^\s*(`{3,}|~{3,})")
    for path in files:
        in_fence = False
        fence_char = None
        for number, line in enumerate(_read(path).splitlines(), 1):
            fence_match = fence_re.match(line)
            if fence_match:
                char = fence_match.group(1)[0]
                if not in_fence:
                    in_fence = True
                    fence_char = char
                elif char == fence_char:
                    in_fence = False
                    fence_char = None
                continue
            if in_fence:
                continue
            for raw_target in LINK_PATTERN.findall(line):
                target = raw_target.strip().split("#", 1)[0]
                if (
                    not target
                    or target.startswith(("#", "http://", "https://", "mailto:", "data:"))
                    or "://" in target
                ):
                    continue
                target_path = (path.parent / target).resolve()
                if not target_path.exists():
                    findings.append(
                        Finding(
                            "error",
                            "BROKEN_LINK",
                            f"Local Markdown link target does not exist: {raw_target}",
                            _relative(path, project),
                            number,
                        )
                    )
    return findings


def _has_verification_reference(lines: list[str], index: int) -> bool:
    window = "\n".join(lines[index : index + 4])
    return bool(
        re.search(r"\bVER-[A-Z0-9][A-Z0-9-]*-\d{3}\b", window)
        or re.search(
            r"(?i)(verification|evidence|验证|证据)\s*[:：].*(pass|passed|通过|命令|检查)",
            window,
        )
    )


def _check_completed_tasks(project: Path) -> list[Finding]:
    tasks = project / "TASKS.md"
    if not tasks.is_file():
        return []
    findings: list[Finding] = []
    lines = _read(tasks).splitlines()
    for index, line in enumerate(lines):
        completed = bool(re.search(r"(?i)(?:-\s*\[x\]|\bstatus\s*:\s*done\b)", line))
        task_id = re.search(r"\bTASK-[A-Z0-9][A-Z0-9-]*-\d{3}\b", line)
        if completed and task_id and not _has_verification_reference(lines, index):
            findings.append(
                Finding(
                    "error",
                    "DONE_WITHOUT_EVIDENCE",
                    f"{task_id.group(0)} is complete without a nearby VER reference or verification result.",
                    "TASKS.md",
                    index + 1,
                )
            )
    return findings


def _check_orphan_specs(project: Path) -> list[Finding]:
    specs = project / "specs"
    if not specs.is_dir():
        return []
    root_text = "\n".join(
        _read(project / name) for name in ROOT_DOCS if (project / name).is_file()
    )
    findings: list[Finding] = []
    for feature_dir in sorted(path for path in specs.iterdir() if path.is_dir()):
        relative = feature_dir.relative_to(project).as_posix()
        if relative not in root_text and f"{relative}/" not in root_text:
            findings.append(
                Finding(
                    "error",
                    "ORPHAN_FEATURE_SPEC",
                    "Feature spec directory is not reachable from a root project-memory index.",
                    relative,
                )
            )
    return findings


def _looks_like_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    return (
        normalized in PLACEHOLDER_VALUES
        or normalized.startswith(("${", "$", "<"))
        or normalized.endswith(("_env", "_token", "_password", "_secret"))
    )


def _check_secrets(project: Path, files: Iterable[Path]) -> list[Finding]:
    findings: list[Finding] = []
    for path in files:
        relative = _relative(path, project)
        for number, line in enumerate(_read(path).splitlines(), 1):
            for pattern in SECRET_PATTERNS:
                match = pattern.search(line)
                if not match:
                    continue
                if len(match.groups()) >= 2 and _looks_like_placeholder(match.group(2)):
                    continue
                findings.append(
                    Finding(
                        "error",
                        "POSSIBLE_SECRET",
                        "Possible credential or private key in project-memory Markdown.",
                        relative,
                        number,
                    )
                )
                break
    return findings


def _normalize_changed_files(project: Path, changed_files: Iterable[str]) -> list[str]:
    normalized: set[str] = set()
    for raw in changed_files:
        path = Path(raw).expanduser()
        if path.is_absolute():
            path = path.resolve()
            try:
                path = path.relative_to(project)
            except ValueError:
                continue
        normalized.add(path.as_posix().lstrip("./"))
    return sorted(path for path in normalized if path)


def _impact_domains(changed_files: Iterable[str]) -> set[str]:
    paths = {Path(path).as_posix().lstrip("./") for path in changed_files}
    domains: set[str] = set()
    ui_change = any(
        re.search(r"(?i)(^|/)(components?|pages?|app|views?|styles?)/", path)
        or Path(path).suffix.lower() in {".css", ".scss", ".sass", ".less"}
        for path in paths
    )
    if ui_change:
        domains.add("design")
    database_change = any(
        re.search(r"(?i)(^|/)(migrations?|prisma|schema|database|db)/", path)
        or path.endswith((".sql", ".prisma"))
        for path in paths
    )
    if database_change:
        domains.add("database")
    architecture_change = any(
        Path(path).name
        in {
            "package.json",
            "pyproject.toml",
            "Cargo.toml",
            "go.mod",
            "Dockerfile",
            "docker-compose.yml",
            "docker-compose.yaml",
        }
        or re.search(r"(?i)(^|/)(api|services?|auth|infra|deploy|types?)/", path)
        for path in paths
    )
    if architecture_change:
        domains.add("architecture")
    return domains


def _change_digest(project: Path, changed_files: Iterable[str]) -> str:
    digest = hashlib.sha256()
    for relative in _normalize_changed_files(project, changed_files):
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        path = project / relative
        if path.is_file():
            digest.update(path.read_bytes())
        else:
            digest.update(b"<missing-or-deleted>")
        digest.update(b"\0")
    return digest.hexdigest()


def _load_json_object(path: Path) -> dict[str, object]:
    if not path.is_file():
        return {}
    try:
        value = json.loads(_read(path))
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def acknowledge_sync(
    project: str | Path,
    *,
    domains: Iterable[str],
    reason: str,
    changed_files: Iterable[str] = (),
) -> None:
    root = Path(project).expanduser().resolve()
    changed = _normalize_changed_files(root, changed_files or _git_changed_files(root))
    requested = set(domains)
    unknown = requested - set(DOMAIN_DOCS)
    if unknown:
        raise ValueError(f"unknown sync domains: {', '.join(sorted(unknown))}")
    impacted = _impact_domains(changed)
    if not requested or not requested.issubset(impacted):
        raise ValueError("acknowledged domains must be present in the current change impact")
    if len(reason.strip()) < 12:
        raise ValueError("sync acknowledgement reason must be specific")
    state_path = root / ".vibe" / "sync-state.json"
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state = {
        "version": 1,
        "change_digest": _change_digest(root, changed),
        "acknowledgements": {
            domain: {"reason": reason.strip()} for domain in sorted(requested)
        },
    }
    state_path.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _check_sync(
    project: Path, changed_files: Iterable[str]
) -> list[Finding]:
    changed = _normalize_changed_files(project, changed_files)
    paths = set(changed)
    impacted = _impact_domains(changed)
    if not impacted:
        return []
    state = _load_json_object(project / ".vibe" / "sync-state.json")
    current_digest = _change_digest(project, changed)
    state_valid = state.get("change_digest") == current_digest
    acknowledgements = state.get("acknowledgements", {})
    if not isinstance(acknowledgements, dict):
        acknowledgements = {}

    findings: list[Finding] = []
    for domain in sorted(impacted):
        doc = DOMAIN_DOCS[domain]
        if doc in paths:
            continue
        if state_valid and domain in acknowledgements:
            continue
        findings.append(
            Finding(
                "error",
                "DOC_SYNC_REQUIRED",
                (
                    f"{domain} impact detected. Update {doc}, or acknowledge that no "
                    "stable fact changed for this exact change digest."
                ),
            )
        )
    return findings


def check_project(
    project: str | Path,
    *,
    strict: bool = False,
    changed_files: Iterable[str] = (),
) -> list[Finding]:
    root = Path(project).expanduser().resolve()
    if not root.is_dir():
        return [
            Finding(
                "error",
                "PROJECT_NOT_FOUND",
                f"Project directory does not exist: {root}",
            )
        ]
    files = _memory_files(root)
    changed = _normalize_changed_files(root, changed_files)
    findings: list[Finding] = []
    findings.extend(_check_required_docs(root, strict))
    findings.extend(_check_validity_metadata(root, files, strict))
    findings.extend(_check_memory_bloat(root))
    findings.extend(_check_agents_router(root))
    findings.extend(_check_claude_bridge(root))
    findings.extend(_check_duplicate_headings(root, files))
    findings.extend(_check_ids(root, files))
    findings.extend(_check_links(root, files))
    findings.extend(_check_completed_tasks(root))
    findings.extend(_check_orphan_specs(root))
    findings.extend(_check_secrets(root, files))
    findings.extend(_check_sync(root, changed))
    return findings


def _ensure_claude_bridge(project: Path) -> None:
    path = project / "CLAUDE.md"
    if not path.exists():
        path.write_text("@AGENTS.md\n", encoding="utf-8")
        return
    text = _read(path)
    first = _first_non_empty_line(text)
    if first and first[1] == "@AGENTS.md":
        return
    path.write_text(f"@AGENTS.md\n\n{text.lstrip()}", encoding="utf-8")


def _install_claude_hook(project: Path) -> None:
    settings_path = project / ".claude" / "settings.json"
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    if settings_path.exists():
        settings = json.loads(_read(settings_path))
        if not isinstance(settings, dict):
            raise ValueError(f"{settings_path} must contain a JSON object")
    else:
        settings = {"$schema": "https://json.schemastore.org/claude-code-settings.json"}

    hooks = settings.setdefault("hooks", {})
    if not isinstance(hooks, dict):
        raise ValueError(f"{settings_path}: hooks must be a JSON object")
    stop = hooks.setdefault("Stop", [])
    if not isinstance(stop, list):
        raise ValueError(f"{settings_path}: hooks.Stop must be a JSON array")

    commands = {
        hook.get("command")
        for group in stop
        if isinstance(group, dict)
        for hook in group.get("hooks", [])
        if isinstance(hook, dict) and hook.get("type") == "command"
    }
    if CLAUDE_HOOK_COMMAND not in commands:
        stop.append(
            {
                "matcher": "",
                "hooks": [
                    {
                        "type": "command",
                        "command": CLAUDE_HOOK_COMMAND,
                        "timeout": 10,
                    }
                ],
            }
        )

    post_tool = hooks.setdefault("PostToolUse", [])
    if not isinstance(post_tool, list):
        raise ValueError(f"{settings_path}: hooks.PostToolUse must be a JSON array")
    track_commands = {
        hook.get("command")
        for group in post_tool
        if isinstance(group, dict)
        for hook in group.get("hooks", [])
        if isinstance(hook, dict) and hook.get("type") == "command"
    }
    if CLAUDE_TRACK_COMMAND not in track_commands:
        post_tool.append(
            {
                "matcher": "Edit|Write|MultiEdit|NotebookEdit",
                "hooks": [
                    {
                        "type": "command",
                        "command": CLAUDE_TRACK_COMMAND,
                        "timeout": 5,
                    }
                ],
            }
        )
    settings_path.write_text(
        json.dumps(settings, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def install_harness(project: str | Path, *, claude_hook: bool = False) -> None:
    root = Path(project).expanduser().resolve()
    if not root.is_dir():
        raise ValueError(f"Project directory does not exist: {root}")
    target = root / ".vibe" / "vibe_doctor.py"
    target.parent.mkdir(parents=True, exist_ok=True)
    source = Path(__file__).resolve()
    if source != target.resolve():
        shutil.copy2(source, target)
    target.chmod(target.stat().st_mode | 0o111)
    if claude_hook:
        _ensure_claude_bridge(root)
        _install_claude_hook(root)


def _git_changed_files(project: Path) -> list[str]:
    commands = (
        ["git", "diff", "--name-only", "HEAD"],
        ["git", "ls-files", "--others", "--exclude-standard"],
    )
    changed: set[str] = set()
    for command in commands:
        result = subprocess.run(
            command,
            cwd=project,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode == 0:
            changed.update(line for line in result.stdout.splitlines() if line)
    return sorted(changed)


def _tracked_files(project: Path) -> list[str]:
    state = _load_json_object(project / ".vibe" / "changed-files.json")
    files = state.get("files", [])
    if not isinstance(files, list):
        return []
    return _normalize_changed_files(project, [str(path) for path in files])


def _all_changed_files(project: Path) -> list[str]:
    return sorted(set(_git_changed_files(project)) | set(_tracked_files(project)))


def _write_tracked_files(project: Path, files: Iterable[str]) -> None:
    path = project / ".vibe" / "changed-files.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {"version": 1, "files": _normalize_changed_files(project, files)},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def _write_snapshot(project: Path, changed_files: Iterable[str]) -> None:
    documents: dict[str, str] = {}
    for path in _memory_files(project):
        documents[_relative(path, project)] = hashlib.sha256(path.read_bytes()).hexdigest()
    changed = _normalize_changed_files(project, changed_files)
    snapshot = {
        "version": 1,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "change_digest": _change_digest(project, changed),
        "changed_files": changed,
        "documents": documents,
    }
    path = project / ".vibe" / "last-check.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _format_finding(finding: Finding) -> str:
    location = finding.path or ""
    if finding.line is not None:
        location = f"{location}:{finding.line}"
    prefix = f"{location}: " if location else ""
    return f"{finding.severity.upper()} {finding.code}: {prefix}{finding.message}"


def _run_claude_hook() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, TypeError):
        payload = {}
    project = Path(payload.get("cwd") or Path.cwd()).resolve()
    changed = _all_changed_files(project)
    findings = check_project(
        project,
        strict=False,
        changed_files=changed,
    )
    errors = [finding for finding in findings if finding.severity == "error"]
    if errors:
        reason = "Vibe harness checks failed:\n" + "\n".join(
            _format_finding(item) for item in errors[:12]
        )
        print(json.dumps({"decision": "block", "reason": reason}, ensure_ascii=False))
    else:
        _write_snapshot(project, changed)
        tracked_path = project / ".vibe" / "changed-files.json"
        if tracked_path.exists():
            tracked_path.unlink()
    return 0


def _run_claude_track() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, TypeError):
        return 0
    project = Path(payload.get("cwd") or Path.cwd()).resolve()
    tool_input = payload.get("tool_input", {})
    if not isinstance(tool_input, dict):
        return 0
    raw_path = (
        tool_input.get("file_path")
        or tool_input.get("path")
        or tool_input.get("notebook_path")
    )
    if not raw_path:
        return 0
    existing = _tracked_files(project)
    _write_tracked_files(project, [*existing, str(raw_path)])
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    check = subparsers.add_parser("check", help="Check a project-memory tree")
    check.add_argument("project", nargs="?", default=".")
    check.add_argument("--strict", action="store_true")
    check.add_argument("--json", action="store_true", dest="as_json")
    check.add_argument("--changed-file", action="append", default=[])

    install = subparsers.add_parser("install", help="Install the project-local harness")
    install.add_argument("project", nargs="?", default=".")
    install.add_argument("--claude-hook", action="store_true")

    acknowledge = subparsers.add_parser(
        "acknowledge", help="Record why impacted docs do not need an update"
    )
    acknowledge.add_argument("project", nargs="?", default=".")
    acknowledge.add_argument("--domain", action="append", required=True)
    acknowledge.add_argument("--reason", required=True)
    acknowledge.add_argument("--changed-file", action="append", default=[])

    subparsers.add_parser("claude-hook", help=argparse.SUPPRESS)
    subparsers.add_parser("claude-track", help=argparse.SUPPRESS)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.command == "claude-hook":
        return _run_claude_hook()
    if args.command == "claude-track":
        return _run_claude_track()
    if args.command == "install":
        try:
            install_harness(args.project, claude_hook=args.claude_hook)
        except (OSError, ValueError, json.JSONDecodeError) as error:
            print(f"vibe_doctor.py: install failed: {error}", file=sys.stderr)
            return 1
        print(f"vibe_doctor.py: installed in {Path(args.project).resolve()}")
        return 0
    if args.command == "acknowledge":
        try:
            acknowledge_sync(
                args.project,
                domains=args.domain,
                reason=args.reason,
                changed_files=args.changed_file or _all_changed_files(Path(args.project).resolve()),
            )
        except (OSError, ValueError) as error:
            print(f"vibe_doctor.py: acknowledge failed: {error}", file=sys.stderr)
            return 1
        print("vibe_doctor.py: sync acknowledgement recorded")
        return 0

    changed = args.changed_file or _all_changed_files(Path(args.project).resolve())
    findings = check_project(args.project, strict=args.strict, changed_files=changed)
    if args.as_json:
        print(
            json.dumps(
                {
                    "findings": [item.to_dict() for item in findings],
                    "errors": sum(item.severity == "error" for item in findings),
                    "warnings": sum(item.severity == "warning" for item in findings),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        for finding in findings:
            print(_format_finding(finding))
        if not findings:
            print("vibe_doctor.py: pass")
    if any(item.severity == "error" for item in findings):
        return 1
    _write_snapshot(Path(args.project).resolve(), changed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
