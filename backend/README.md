---
title: AutoTest AI Backend API
emoji: 🤖
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Multi-Agent Software Quality Engineer FastAPI Backend
---

# AutoTest AI Backend API (Hugging Face Space)

Autonomous Multi-Agent Software Quality Engineering system built with FastAPI, LangChain, LangGraph, MongoDB, Neo4j, and ChromaDB.

## Features
- **Multi-Agent Pipeline**: Autonomous generation of test cases, root cause analysis, and automated program repair.
- **RESTful API**: FastAPI with auto-generated OpenAPI documentation (`/docs`).
- **Graph & Vector RAG**: Neo4j knowledge graphs combined with ChromaDB code embeddings.

## Hugging Face Space Environment Secrets / Variables

Configure the following secrets in **Settings -> Repository Secrets**:

| Variable | Description | Example / Required |
|----------|-------------|--------------------|
| `APP_ENV` | Environment | `production` |
| `LOG_LEVEL` | Log verbosity | `INFO` |
| `CORS_ORIGINS` | Allowed frontend domains | `https://autotest-ai.vercel.app,http://localhost:3000` |
| `MONGODB_URL` | MongoDB Atlas Connection String | `mongodb+srv://<user>:<password>@cluster.mongodb.net/autotest` |
| `MONGODB_DB_NAME` | Database name | `autotest` |
| `NEO4J_URI` | Neo4j Connection URI | `neo4j+s://<db_id>.databases.neo4j.io` |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `<your_neo4j_password>` |
| `REDIS_URL` | Redis Connection URL | `rediss://default:<password>@<host>:<port>` |
| `GROQ_API_KEY` | Groq LLM API Key | `gsk_...` |
| `ANTHROPIC_API_KEY` | Anthropic Claude Key (Optional) | `sk-ant-...` |
| `JWT_SECRET` | Secret key for auth tokens | `<random_32_char_string>` |

## Local Development & Docker Verification

```bash
# Build Docker image locally
docker build -t autotest-backend .

# Run container listening on port 7860
docker run -p 7860:7860 --env-file .env autotest-backend
```
