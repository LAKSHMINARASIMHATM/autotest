
import asyncio
from app.knowledge.graph.graph_query_service import GraphQueryService
from app.core.database import init_db
from app.models.project import Project

async def main():
    await init_db()
    projects = await Project.find_all().to_list()
    print("Found projects:")
    for p in projects:
        print(f"- {p.id}: {p.name}")
        if p.id:
            try:
                tree = await GraphQueryService.get_project_graph_tree(str(p.id))
                print(f"Graph tree: {tree}")
            except Exception as e:
                print(f"Error getting graph: {e}")

if __name__ == "__main__":
    asyncio.run(main())

