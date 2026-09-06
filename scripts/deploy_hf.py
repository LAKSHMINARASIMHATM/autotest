#!/usr/bin/env python3
"""
deploy_hf.py — Deploy AutoTestAI Backend to Hugging Face Spaces.

Usage:
    python scripts/deploy_hf.py --space <your-hf-username>/<your-space-name> [--token <hf_token>] [--pr]

Requirements:
    pip install huggingface_hub
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from huggingface_hub import HfApi
except ImportError:
    print("Error: 'huggingface_hub' is not installed. Install it with: pip install huggingface_hub")
    sys.exit(1)


def deploy_to_huggingface(space_id: str, token: str | None = None, force_pr: bool = False) -> None:
    backend_dir = Path(__file__).resolve().parent.parent / "backend"
    if not backend_dir.exists():
        print(f"Error: Backend directory not found at {backend_dir}")
        sys.exit(1)

    hf_token = token or os.getenv("HF_TOKEN")
    if not hf_token:
        print("Error: Hugging Face Token not found. Set HF_TOKEN environment variable or pass --token.")
        sys.exit(1)

    api = HfApi(token=hf_token)

    print(f"Deploying AutoTestAI backend from {backend_dir} to Hugging Face Space: '{space_id}'...")

    try:
        # Try creating space (if not created yet on UI)
        api.create_repo(
            repo_id=space_id,
            repo_type="space",
            space_sdk="docker",
            private=False,
            exist_ok=True,
        )
        print(f"[SUCCESS] Space '{space_id}' created/verified successfully.")
    except Exception as e:
        print(f"[NOTE] Space creation note: {e}")

    # Exclude temporary local files, virtual environments, and downloaded repo datasets
    ignore_list = [
        ".venv/*",
        "**/.venv/*",
        "**/__pycache__/*",
        "*.pyc",
        ".pytest_cache/*",
        "**/.pytest_cache/*",
        ".mypy_cache/*",
        "**/.mypy_cache/*",
        ".ruff_cache/*",
        "**/.ruff_cache/*",
        ".git/*",
        "**/.git/*",
        ".coverage",
        "data/*",
        "data/**",
        "**/node_modules/*",
    ]

    try:
        print(f"Uploading files to Hugging Face Space '{space_id}'...")
        commit_info = api.upload_folder(
            folder_path=str(backend_dir),
            repo_id=space_id,
            repo_type="space",
            ignore_patterns=ignore_list,
            create_pr=force_pr,
            commit_message="Deploy backend to Hugging Face Spaces",
        )

        domain_slug = space_id.replace("/", "-").lower()
        print("\n[SUCCESS] Deployment / Commit completed successfully!")
        if force_pr:
            print(f"PR Created: {commit_info}")
            print(f"Merge PR on Hugging Face: https://huggingface.co/spaces/{space_id}/discussions")
        else:
            print(f"Space URL: https://huggingface.co/spaces/{space_id}")
            print(f"Direct App API URL: https://{domain_slug}.hf.space")
            print(f"OpenAPI Documentation: https://{domain_slug}.hf.space/docs")

    except Exception as e:
        if "403 Forbidden" in str(e) and not force_pr:
            print("[NOTE] Direct push returned 403. Attempting to create a Pull Request instead...")
            try:
                commit_info = api.upload_folder(
                    folder_path=str(backend_dir),
                    repo_id=space_id,
                    repo_type="space",
                    ignore_patterns=ignore_list,
                    create_pr=True,
                    commit_message="Deploy backend to Hugging Face Spaces",
                )
                print("\n[SUCCESS] Pull Request created successfully on Hugging Face!")
                print(f"Review & Merge PR here: https://huggingface.co/spaces/{space_id}/discussions")
                return
            except Exception as pr_err:
                print(f"[ERROR] PR creation failed: {pr_err}")

        print(f"[ERROR] Upload failed: {e}")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy AutoTestAI Backend to Hugging Face Spaces")
    parser.add_argument("--space", required=True, help="Hugging Face Space ID (e.g., username/space-name)")
    parser.add_argument("--token", help="Hugging Face Access Token (or set HF_TOKEN env var)")
    parser.add_argument("--pr", action="store_true", help="Create Pull Request instead of direct commit")

    args = parser.parse_args()
    deploy_to_huggingface(args.space, args.token, args.pr)


if __name__ == "__main__":
    main()
