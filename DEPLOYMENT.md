# 🚀 AutoTest AI — Full Stack Deployment Guide
## Deploying Backend to Hugging Face Spaces & Frontend to Vercel

This guide provides step-by-step instructions for deploying **AutoTest AI**:
- **Backend API (FastAPI + LangGraph + Docker)** ➡️ **Hugging Face Spaces**
- **Frontend App (Next.js 16 + React 19 + Tailwind)** ➡️ **Vercel**

---

## 📋 Overview & Prerequisites

### Architecture
```
┌──────────────────────────────────────┐       HTTPS / REST       ┌──────────────────────────────────────────────┐
│          Vercel Frontend             │  ─────────────────────>  │         Hugging Face Spaces Backend          │
│       (Next.js App Router)           │                          │        (FastAPI Docker Container)            │
│  https://autotest-ai.vercel.app      │                          │  https://<user>-<space>.hf.space            │
└──────────────────────────────────────┘                          └──────────────────────┬───────────────────────┘
                                                                                         │
                                                                   ┌─────────────────────┴──────────────────────┐
                                                                   │          Cloud Database Services           │
                                                                   │  - MongoDB Atlas (Document DB)             │
                                                                   │  - Neo4j AuraDB (Knowledge Graph)          │
                                                                   │  - Upstash Redis (Caching & Rate Limiting) │
                                                                   └────────────────────────────────────────────┘
```

### Prerequisites
1. **GitHub Account** (Repository hosted on GitHub).
2. **Hugging Face Account** with an Access Token (`Write` permission).
3. **Vercel Account** linked to your GitHub.
4. **Cloud Database Credentials** (Free Tiers available):
   - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free M0 Cluster)
   - [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/) (Free Tier)
   - [Upstash Redis](https://upstash.com/) (Free Tier)

---

## 🛠️ Step 1: Deploying Backend to Hugging Face Spaces

### Method A: Automated Deployment via Python Script (Recommended)

1. Get your **Hugging Face Access Token**:
   - Go to [Hugging Face Settings -> Access Tokens](https://huggingface.co/settings/tokens).
   - Create a token with **Write** role.

2. Run the deployment script from your terminal:
   ```bash
   # Option 1: Using environment variable
   export HF_TOKEN="hf_your_write_token"
   python scripts/deploy_hf.py --space <your-hf-username>/autotest-backend

   # Option 2: Pass token directly
   python scripts/deploy_hf.py --space <your-hf-username>/autotest-backend --token hf_your_write_token
   ```

### Method B: Manual Git Push to Hugging Face

1. Create a Space on Hugging Face:
   - Go to [Hugging Face -> New Space](https://huggingface.co/new-space).
   - Name: `autotest-backend`
   - Select SDK: **Docker** (Blank template).
   - License: **MIT**.

2. Clone your Space repository locally:
   ```bash
   git clone https://huggingface.co/spaces/<your-hf-username>/autotest-backend hf-backend-repo
   ```

3. Copy the contents of the `backend/` directory into `hf-backend-repo/`:
   ```bash
   cp -r backend/* hf-backend-repo/
   cd hf-backend-repo
   git add .
   git commit -m "Initial backend deployment"
   git push origin main
   ```

---

## 🔐 Step 2: Configure Backend Environment Secrets on Hugging Face

1. Navigate to your Hugging Face Space page (`https://huggingface.co/spaces/<username>/autotest-backend`).
2. Go to **Settings** -> **Repository Secrets** -> **New Secret**.
3. Add the following required secrets:

| Secret Name | Description | Recommended Value / Example |
|-------------|-------------|-----------------------------|
| `APP_ENV` | Environment | `production` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PORT` | App Port | `7860` |
| `CORS_ORIGINS` | Allowed origins | `https://autotest-ai.vercel.app,http://localhost:3000` |
| `MONGODB_URL` | MongoDB Atlas URL | `mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true` |
| `MONGODB_DB_NAME` | Database Name | `autotest_prod` |
| `NEO4J_URI` | Neo4j Aura URL | `neo4j+s://<db_id>.databases.neo4j.io` |
| `NEO4J_USER` | Neo4j Username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j Password | `<your_aura_password>` |
| `REDIS_URL` | Redis URL | `rediss://default:<password>@<host>:<port>` |
| `GROQ_API_KEY` | Groq LLM Key | `gsk_...` |
| `JWT_SECRET` | Auth Token Secret | `<generate_32_char_secret>` |

4. Hugging Face will automatically rebuild the container. Once running, your API URL will be:
   ```
   https://<your-username>-autotest-backend.hf.space
   ```
5. Test the health endpoint: `https://<your-username>-autotest-backend.hf.space/health`

---

## 🌐 Step 3: Deploying Frontend to Vercel

### Method A: Deploy via Vercel Dashboard (Easiest)

1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Click **Import** next to your GitHub repository (`autotest`).
3. Configure Project Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: Select Edit -> Choose `frontend` directory.
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Expand **Environment Variables** and add:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://<your-username>-autotest-backend.hf.space/api/v1`
5. Click **Deploy**.

### Method B: Deploy via Vercel CLI

```bash
cd frontend
npm install -g vercel

# Login to Vercel
vercel login

# Deploy preview
vercel

# Deploy production with environment variable
vercel --prod --build-env NEXT_PUBLIC_API_URL="https://<your-username>-autotest-backend.hf.space/api/v1"
```

---

## 🔄 Step 4: Configure CORS & Cross-Origin Verification

Ensure your Hugging Face Space secret `CORS_ORIGINS` includes your Vercel deployment URL:
```env
CORS_ORIGINS=https://autotest-ai.vercel.app,https://<your-vercel-domain>.vercel.app
```

---

## 🤖 Step 5: Automated Deployment via GitHub Actions (CI/CD)

The project includes pre-configured GitHub Actions workflows in `.github/workflows/`:

1. Set GitHub Repository Secrets (**Settings** -> **Secrets and variables** -> **Actions**):
   - `HF_TOKEN`: Hugging Face Access Token with Write access.
   - `HF_SPACE_REPO`: `username/autotest-backend`
   - `VERCEL_TOKEN`: Token from Vercel Account Settings.
   - `VERCEL_ORG_ID`: Vercel Org ID (found in Project Settings).
   - `VERCEL_PROJECT_ID`: Vercel Project ID (found in Project Settings).

2. Push changes to `main` branch to trigger automatic builds and deployments to both Hugging Face Spaces and Vercel!

---

## ✅ Deployment Checklist

- [x] `backend/README.md` created with Hugging Face Space YAML metadata.
- [x] `backend/Dockerfile` configured to expose port `7860` with UID 1000.
- [x] `backend/.env.production.example` template provided.
- [x] `frontend/vercel.json` configured for Next.js framework.
- [x] `frontend/.env.production.example` created with `NEXT_PUBLIC_API_URL`.
- [x] `scripts/deploy_hf.py` Python helper created.
- [x] `.github/workflows/deploy-huggingface.yml` created.
- [x] `.github/workflows/deploy-vercel.yml` created.
- [x] Database URLs configured (MongoDB Atlas, Neo4j Aura).
