"""GitHub Import Service — clones a GitHub repo and extracts code structure.

Steps:
1. Clone repo to a temp directory using gitpython or system git
2. Walk the file tree collecting Python/JS/TS files
3. Extract function signatures and class names via AST (Python) or regex (JS/TS)
4. Return a structured summary for the agent pipeline to consume
"""
from __future__ import annotations

import ast
import io
import os
import re
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

try:
    import git
except ImportError:
    git = None  # Fallback to subprocess git command if GitPython is missing

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
    content: str = ""


@dataclass
class RepoSummary:
    repo_url: str
    branch: str
    language: str
    framework: str
    total_files: int
    total_functions: int
    total_classes: int
    files: list[CodeFile]
    api_endpoints: list[dict[str, str]]
    local_path: str = ""


def cleanup_clone(local_path: str) -> None:
    """Clean up cloned temporary directory if it exists."""
    if local_path and os.path.exists(local_path):
        try:
            shutil.rmtree(local_path, ignore_errors=True)
            logger.info("cleaned_up_clone", path=local_path)
        except Exception as e:
            logger.warning("cleanup_clone_failed", path=local_path, error=str(e))


def _detect_language(code_files: list[CodeFile]) -> str:
    counts: dict[str, int] = {}
    for f in code_files:
        counts[f.language] = counts.get(f.language, 0) + 1
    if not counts:
        return "Unknown"
    return max(counts, key=counts.get)


def _detect_framework(code_files: list[CodeFile], repo_root: Path) -> str:
    # Quick check by package manifests
    pkg = repo_root / "package.json"
    if pkg.exists():
        content = pkg.read_text(errors="ignore").lower()
        if "next" in content:
            return "Next.js"
        if "react" in content:
            return "React"
        if "express" in content:
            return "Express"
        if "vue" in content:
            return "Vue"
    pyproject = repo_root / "pyproject.toml"
    if pyproject.exists():
        content = pyproject.read_text(errors="ignore").lower()
        if "fastapi" in content:
            return "FastAPI"
        if "django" in content:
            return "Django"
        if "flask" in content:
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
        functions = re.findall(r"(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\()", source)
        flat_fn = [f[0] or f[1] for f in functions if f[0] or f[1]]
        classes = re.findall(r"class\s+([a-zA-Z0-9_]+)", source)
        imports = re.findall(r"(?:import|require)\s*\(?['\"]([^'\"]+)['\"]", source)
        ext = path.suffix.lstrip(".")
        lang = "typescript" if ext in ("ts", "tsx") else "javascript"
        return CodeFile(
            path=rel_path,
            language=lang,
            functions=flat_fn[:30],
            classes=classes[:15],
            imports=imports[:15],
            content=source[:3000],
        )
    except Exception:
        return CodeFile(path=rel_path, language="javascript", content="")


def _extract_api_endpoints(code_files: list[CodeFile]) -> list[dict[str, str]]:
    endpoints = []
    # FastAPI decorator patterns: @app.get('/path'), @router.post('/path')
    pattern = re.compile(r'@(?:app|router)\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)["\']')
    for file in code_files:
        if file.content:
            for match in pattern.finditer(file.content):
                method, route_path = match.groups()
                endpoints.append({"method": method.upper(), "path": route_path})
    return endpoints[:20]


def scan_directory(dir_path: str, repo_url: str = "", branch: str = "main") -> RepoSummary:
    """Scan an unpacked local directory as if it were a cloned repo."""
    repo_root = Path(dir_path)
    code_files: list[CodeFile] = []
    count = 0

    skip_dirs = {
        ".git", "node_modules", ".next", "dist", "build",
        ".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache"
    }

    for root, dirs, files in os.walk(repo_root):
        dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith(".")]
        if count >= MAX_FILES:
            break
        for f in files:
            if count >= MAX_FILES:
                break
            fpath = Path(root) / f
            if fpath.stat().st_size > MAX_FILE_SIZE:
                continue
            rel = str(fpath.relative_to(repo_root)).replace("\\", "/")
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
        branch=branch or "main",
        language=language,
        framework=framework,
        total_files=len(code_files),
        total_functions=sum(len(f.functions) for f in code_files),
        total_classes=sum(len(f.classes) for f in code_files),
        files=code_files,
        api_endpoints=endpoints,
        local_path=dir_path,
    )
    logger.info(
        "scan_complete",
        files=summary.total_files,
        functions=summary.total_functions,
        classes=summary.total_classes,
        endpoints=len(endpoints),
    )
    return summary


async def clone_and_scan(repo_url: str, branch: str | None = None) -> RepoSummary:
    """Clone a GitHub repo (or download a ZIP url) to a temp dir and extract its code structure."""
    repo_url = repo_url.strip() if repo_url else ""
    if branch:
        branch = branch.strip()

    # Sanitize and deduplicate URL if concatenated twice by input field
    url_matches = re.findall(r"https?://[^\s]+", repo_url)
    if url_matches:
        repo_url = url_matches[0]
    elif not repo_url.startswith("http"):
        repo_url = "https://" + repo_url

    tmpdir = tempfile.mkdtemp(prefix="autotest_")
    try:
        # Check if this is a ZIP download URL
        if repo_url.endswith(".zip") or "zip" in repo_url.lower() or "archive" in repo_url.lower():
            logger.info("downloading_zip_url", url=repo_url)
            req = urllib.request.Request(
                repo_url,
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req) as response:
                zip_data = response.read()

            with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
                z.extractall(tmpdir)

            # Collapse single root folder if present
            subdirs = [d for d in os.listdir(tmpdir) if os.path.isdir(os.path.join(tmpdir, d))]
            all_items = os.listdir(tmpdir)
            if len(all_items) == 1 and len(subdirs) == 1:
                subdir_path = os.path.join(tmpdir, subdirs[0])
                for item in os.listdir(subdir_path):
                    shutil.move(os.path.join(subdir_path, item), tmpdir)
                os.rmdir(subdir_path)

            return scan_directory(tmpdir, repo_url, branch or "main")

        # Otherwise, clone via Git
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

        if git is not None:
            # Try to clone with the specified branch first (if any) using GitPython
            try:
                if actual_branch:
                    logger.info("cloning_repo", url=repo_url, branch=actual_branch)
                    repo = git.Repo.clone_from(repo_url, tmpdir, branch=actual_branch, **clone_kwargs)
            except Exception:
                logger.warning("specified_branch_not_found", url=repo_url, branch=actual_branch)
                actual_branch = None
                shutil.rmtree(tmpdir, ignore_errors=True)
                tmpdir = tempfile.mkdtemp(prefix="autotest_")

            if not repo:
                try:
                    logger.info("cloning_repo_default_branch", url=repo_url)
                    repo = git.Repo.clone_from(repo_url, tmpdir, **clone_kwargs)
                    try:
                        actual_branch = repo.active_branch.name
                    except Exception:
                        actual_branch = "HEAD"
                except Exception as e:
                    logger.warning("gitpython_clone_failed_trying_subprocess", error=str(e))
                    repo = None

        # Fallback to subprocess system git command if GitPython is unavailable or failed
        if not repo:
            cmd = ["git", "clone", "--depth", "1"]
            if actual_branch:
                cmd.extend(["-b", actual_branch])
            cmd.extend([repo_url, tmpdir])
            logger.info("cloning_repo_subprocess", cmd=cmd)
            proc = subprocess.run(cmd, env=clone_env, capture_output=True, text=True)
            if proc.returncode != 0 and actual_branch:
                # Retry default branch
                shutil.rmtree(tmpdir, ignore_errors=True)
                tmpdir = tempfile.mkdtemp(prefix="autotest_")
                cmd = ["git", "clone", "--depth", "1", repo_url, tmpdir]
                proc = subprocess.run(cmd, env=clone_env, capture_output=True, text=True)
            if proc.returncode != 0:
                raise RuntimeError(f"Git clone failed: {proc.stderr}")

        logger.info("clone_complete", path=tmpdir, branch=actual_branch or "main")
        return scan_directory(tmpdir, repo_url, actual_branch or "main")

    except Exception as e:
        shutil.rmtree(tmpdir, ignore_errors=True)
        logger.error("clone_failed", error=str(e), exc_info=True)
        raise e
