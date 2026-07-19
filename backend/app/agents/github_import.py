"""GitHub Import Service — clones a GitHub repo and extracts code structure.

Steps:
1. Clone repo to a temp directory using gitpython
2. Walk the file tree collecting Python/JS/TS files
3. Extract function signatures and class names via AST (Python) or regex (JS/TS)
4. Return a structured summary for the agent pipeline to consume
"""
from __future__ import annotations

import ast
import os
import re
import shutil
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import git

from app.core.logging import get_logger

logger = get_logger(__name__)

SUPPORTED_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".java", ".go"}
MAX_FILES = 200          # cap to avoid memory issues
MAX_FILE_SIZE = 50_000   # bytes — skip giant files


@dataclass
class CodeFile:
    path: str
    language: str
    functions: list[str] = field(default_factory=list)
    classes: list[str] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)
    content: str = ""          # first 3000 chars of source


@dataclass
class RepoSummary:
    repo_url: str
    branch: str
    language: str
    framework: str
    total_files: int
    total_functions: int
    total_classes: int
    files: list[CodeFile] = field(default_factory=list)
    api_endpoints: list[dict[str, str]] = field(default_factory=list)
    local_path: str = ""


def _detect_language(files: list[CodeFile]) -> str:
    counts: dict[str, int] = {}
    for f in files:
        counts[f.language] = counts.get(f.language, 0) + 1
    return max(counts, key=lambda k: counts[k], default="python")


def _detect_framework(files: list[CodeFile], repo_root: Path) -> str:
    # Check package.json / pyproject.toml / requirements.txt
    pkg = repo_root / "package.json"
    if pkg.exists():
        content = pkg.read_text(errors="ignore")
        if "next" in content:
            return "Next.js"
        if "react" in content:
            return "React"
        if "express" in content:
            return "Express"
    pyproject = repo_root / "pyproject.toml"
    if pyproject.exists():
        content = pyproject.read_text(errors="ignore")
        if "fastapi" in content.lower():
            return "FastAPI"
        if "django" in content.lower():
            return "Django"
        if "flask" in content.lower():
            return "Flask"
    req = repo_root / "requirements.txt"
    if req.exists():
        content = req.read_text(errors="ignore").lower()
        if "fastapi" in content:
            return "FastAPI"
        if "django" in content:
            return "Django"
        if "flask" in content:
            return "Flask"
    return ""


def _parse_python_file(path: Path, rel_path: str) -> CodeFile:
    try:
        source = path.read_text(errors="ignore")
        tree = ast.parse(source)
        functions = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
        classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
        imports = [
            ast.unparse(n)
            for n in ast.walk(tree)
            if isinstance(n, (ast.Import, ast.ImportFrom))
        ][:15]
        return CodeFile(
            path=rel_path,
            language="python",
            functions=functions[:30],
            classes=classes[:15],
            imports=imports,
            content=source[:3000],
        )
    except Exception:
        return CodeFile(path=rel_path, language="python", content="")


def _parse_js_ts_file(path: Path, rel_path: str) -> CodeFile:
    try:
        source = path.read_text(errors="ignore")
        functions = re.findall(r"(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\()", source)
        flat_fns = [f[0] or f[1] for f in functions if f[0] or f[1]]
        classes = re.findall(r"class\s+(\w+)", source)
        ext = path.suffix.lower()
        lang = "typescript" if ext in {".ts", ".tsx"} else "javascript"
        return CodeFile(
            path=rel_path,
            language=lang,
            functions=flat_fns[:30],
            classes=classes[:15],
            content=source[:3000],
        )
    except Exception:
        return CodeFile(path=rel_path, language="javascript")


def _extract_api_endpoints(files: list[CodeFile]) -> list[dict[str, str]]:
    """Heuristically detect REST endpoints from FastAPI / Express / Next.js routes."""
    endpoints: list[dict[str, str]] = []
    route_re = re.compile(
        r'@(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    next_re = re.compile(r"export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b")

    for f in files:
        for match in route_re.finditer(f.content):
            endpoints.append({"method": match.group(1).upper(), "path": match.group(2)})
        for match in next_re.finditer(f.content):
            # Use file path as route guess
            route = "/" + f.path.replace("\\", "/").replace("src/app", "").replace("/route.ts", "")
            endpoints.append({"method": match.group(1).upper(), "path": route})
    return endpoints[:30]


async def clone_and_scan(repo_url: str, branch: str | None = None) -> RepoSummary:
    """Clone a GitHub repo to a temp dir and extract its code structure."""
    # Normalise URL
    if not repo_url.startswith("http"):
        repo_url = "https://" + repo_url

    tmpdir = tempfile.mkdtemp(prefix="autotest_")
    try:
        # Merge LFS-skip flag into the full OS environment so PATH/HOME etc. are preserved.
        clone_env = {**os.environ, "GIT_LFS_SKIP_SMUDGE": "1"}
        clone_kwargs = {
            "depth": 1,
            "env": clone_env,
            "multi_options": [
                "-c filter.lfs.smudge=",
                "-c filter.lfs.required=false",
            ],
            "allow_unsafe_options": True,
        }
        
        repo = None
        actual_branch = branch
        
        # Try to clone with the specified branch first (if any)
        try:
            if actual_branch:
                logger.info("cloning_repo", url=repo_url, branch=actual_branch)
                repo = git.Repo.clone_from(repo_url, tmpdir, branch=actual_branch, **clone_kwargs)
        except git.GitCommandError:
            logger.warning("specified_branch_not_found", url=repo_url, branch=actual_branch)
            actual_branch = None  # Fall back to default branch
            # Clean up the tmpdir since the failed clone left it there
            shutil.rmtree(tmpdir, ignore_errors=True)
            # Recreate the tmpdir
            tmpdir = tempfile.mkdtemp(prefix="autotest_")
        
        # If no branch specified or failed, clone without branch (uses default)
        if not repo:
            logger.info("cloning_repo_default_branch", url=repo_url)
            repo = git.Repo.clone_from(repo_url, tmpdir, **clone_kwargs)
            # Get the actual default branch name
            try:
                actual_branch = repo.active_branch.name
            except TypeError:
                # If detached HEAD, try to get the branch from remote
                actual_branch = "HEAD"
        
        logger.info("clone_complete", path=tmpdir, branch=actual_branch)

        repo_root = Path(tmpdir)
        code_files: list[CodeFile] = []
        count = 0

        for root, dirs, files in os.walk(tmpdir):
            # Skip hidden dirs, node_modules, __pycache__, .venv
            dirs[:] = [
                d for d in dirs
                if not d.startswith(".") and d not in {"node_modules", "__pycache__", ".venv", "dist", "build", ".next"}
            ]
            for fname in files:
                if count >= MAX_FILES:
                    break
                fpath = Path(root) / fname
                if fpath.suffix.lower() not in SUPPORTED_EXTENSIONS:
                    continue
                if fpath.stat().st_size > MAX_FILE_SIZE:
                    continue
                rel = str(fpath.relative_to(repo_root))

                if fpath.suffix == ".py":
                    code_files.append(_parse_python_file(fpath, rel))
                elif fpath.suffix in {".ts", ".tsx", ".js", ".jsx"}:
                    code_files.append(_parse_js_ts_file(fpath, rel))
                else:
                    code_files.append(CodeFile(path=rel, language=fpath.suffix.lstrip(".")))
                count += 1

        language = _detect_language(code_files)
        framework = _detect_framework(code_files, repo_root)
        endpoints = _extract_api_endpoints(code_files)

        summary = RepoSummary(
            repo_url=repo_url,
            branch=actual_branch,
            language=language,
            framework=framework,
            total_files=len(code_files),
            total_functions=sum(len(f.functions) for f in code_files),
            total_classes=sum(len(f.classes) for f in code_files),
            files=code_files,
            api_endpoints=endpoints,
            local_path=tmpdir,
        )
        logger.info(
            "scan_complete",
            files=summary.total_files,
            functions=summary.total_functions,
            classes=summary.total_classes,
            endpoints=len(endpoints),
        )
        return summary

    except Exception as e:
        shutil.rmtree(tmpdir, ignore_errors=True)
        logger.exception("clone_failed", error=str(e))
        raise


def cleanup_clone(local_path: str) -> None:
    """Remove the temporary cloned directory."""
    if local_path and os.path.exists(local_path):
        shutil.rmtree(local_path, ignore_errors=True)
        logger.info("clone_cleaned", path=local_path)
