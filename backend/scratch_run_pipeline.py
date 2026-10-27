import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from app.agents.github_import import scan_directory
from app.agents.orchestrator import build_agent_graph
from app.agents.state import PipelineStatus
from langchain_groq import ChatGroq

load_dotenv()


async def main():
    target_repo = str((Path(__file__).parent.parent / "test-bug-repo").resolve())
    print(f"Scanning target repo: {target_repo}")
    summary = scan_directory(target_repo, repo_url="local/test-bug-repo")

    repo_summary_dict = {
        "repo_url": summary.repo_url,
        "language": summary.language or "python",
        "framework": summary.framework or "pytest",
        "total_files": summary.total_files,
        "total_functions": summary.total_functions,
        "total_classes": summary.total_classes,
        "api_endpoints": summary.api_endpoints[:20],
        "files": [
            {
                "path": f.path,
                "language": f.language,
                "functions": f.functions[:10],
                "classes": f.classes[:5],
                "content": f.content[:1500],
            }
            for f in summary.files[:30]
        ],
    }

    api_key = os.environ.get("GROQ_API_KEY", "")
    llm = ChatGroq(model_name="llama-3.3-70b-versatile", groq_api_key=api_key, temperature=0.2)

    graph = build_agent_graph(llm).compile()

    initial_state = {
        "project_id": "test-project-123",
        "session_id": "session-test-run",
        "iteration": 0,
        "max_iterations": 3,
        "status": PipelineStatus.PLANNING,
        "messages": [],
        "repo_url": summary.repo_url,
        "language": summary.language or "python",
        "framework": summary.framework or "pytest",
        "local_path": target_repo,
        "repo_summary": repo_summary_dict,
    }

    print("\nStarting full 14-agent pipeline execution...")
    final_state = None
    async for state_snapshot in graph.astream(initial_state, stream_mode="values"):
        status = state_snapshot.get("status", "unknown")
        explanations = state_snapshot.get("explanations", [])
        last_exp = explanations[-1].decision if explanations else ""
        print(f"[{status}] -> {last_exp}")
        final_state = state_snapshot

    print("\n==========================================")
    print("PIPELINE EXECUTION COMPLETE")
    print("==========================================")
    if final_state:
        exec_res = final_state.get("execution_result")
        if exec_res:
            print(f"Execution Result: Passed={exec_res.passed}, Failed={exec_res.failed}, Total={exec_res.total}")

        validations = final_state.get("patch_validations", [])
        print(f"Patch Validations ({len(validations)}):")
        for v in validations:
            print(f"  - Patch ID: {v.patch_id}, Verdict: {v.verdict}")
            print(f"    Reason: {v.reason}")

        reg_report = final_state.get("regression_report")
        if reg_report:
            print(f"Regression Report: OK={reg_report.ok}, Message={reg_report.message}")


if __name__ == "__main__":
    asyncio.run(main())
