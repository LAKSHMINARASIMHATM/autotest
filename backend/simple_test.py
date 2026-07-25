
import asyncio
import sys
sys.path.insert(0, 'd:\\autotest\\backend')
from app.knowledge.graph.graph_builder import GraphBuilder
from app.agents.github_import import scan_directory
from app.api.v1.endpoints.projects import ingest_project_structure_background
import os

async def main():
    project_id = "6a5905c93f9f578011bad99c"
    print("Clearing project graph")
    await GraphBuilder.clear_project_structure(project_id)
    print("Scanning directory d:/autotest")
    summary = scan_directory("d:/autotest", "", "main")
    print("Ingesting files")
    await ingest_project_structure_background(project_id, summary)
    print("All done")
    
if __name__ == "__main__":
    asyncio.run(main())

