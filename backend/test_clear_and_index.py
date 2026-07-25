
import asyncio
import sys
sys.path.insert(0, 'd:\\autotest\\backend')
from app.knowledge.graph.graph_builder import GraphBuilder
from app.agents.github_import import scan_directory
from app.api.v1.endpoints.projects import ingest_project_structure_background
from app.core.config import Settings
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.user import User
from app.models.api_key import ApiKey
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.code_entity import CodeEntity
from app.models.test_case import TestCase
from app.models.test_result import TestResult
from app.models.bug_report import BugReport
from app.models.patch import Patch
from app.models.audit_log import AuditLogEntry

async def main():
    settings = Settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[
        User, ApiKey, Project, SourceFile, CodeEntity, TestCase, TestResult,
        BugReport, Patch, AuditLogEntry
    ])
    
    projects = await Project.find_all().to_list()
    if not projects:
        print("No projects")
        return
    p = projects[0]
    print(f"Clearing graph for {p.name} ({p.id})")
    await GraphBuilder.clear_project_structure(str(p.id))
    print(f"Scanning directory {p.local_path}")
    summary = scan_directory(p.local_path, p.repo_url, p.branch or "main")
    print(f"Ingesting {len(summary.files)} files into graph")
    await ingest_project_structure_background(str(p.id), summary)
    print("Done!")
    
if __name__ == "__main__":
    asyncio.run(main())

