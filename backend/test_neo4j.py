
import asyncio
from app.knowledge.graph.neo4j_service import Neo4jService

async def main():
    try:
        result = await Neo4jService.execute_query("MATCH (n) RETURN n LIMIT 5")
        print("Neo4j test result:", result)
    except Exception as e:
        print("Neo4j test error:", type(e), str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

