# 🚀 Render.com Deployment Guide

## ✅ Fixed Issues

The `render.yaml` file has been corrected to remove the invalid `property: url` error. The configuration now uses proper Render.com syntax.

## 📋 Pre-Deployment Checklist

Before deploying to Render.com, ensure you have:

- [x] GitHub repository with your code
- [ ] MongoDB Atlas cluster set up and running
- [ ] Google Gemini API key
- [ ] Render.com account (free tier available)

## 🎯 Deployment Steps

### Step 1: Push Latest Changes to GitHub

```bash
git add .
git commit -m "Fix render.yaml configuration"
git push origin main
```

### Step 2: Create New Web Service on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository: `LAKSHMINARASIMHATM/shopping-app`
4. Render will automatically detect `render.yaml`

### Step 3: Configure Environment Variables

After the blueprint is detected, you'll need to set these environment variables in the Render dashboard:

#### For Backend Service (`shop-backend`):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `MONGO_URL` | `mongodb+srv://simha:narasimha@cluster0.nmaqxhm.mongodb.net/?appName=Cluster0` | Your MongoDB connection string |
| `GEMINI_API_KEY` | `your-gemini-api-key` | Get from https://makersuite.google.com/app/apikey |
| `DB_NAME` | `shop_assistant` | Auto-set in render.yaml |
| `JWT_SECRET` | Auto-generated | Render will generate this |
| `PYTHON_VERSION` | `3.10.12` | Auto-set in render.yaml |
| `CORS_ORIGINS` | `*` | Auto-set (update after frontend deployment) |

#### For Frontend Service (`shop-frontend`):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `REACT_APP_BACKEND_URL` | `https://shop-backend.onrender.com/api` | Set after backend is deployed |

### Step 4: Deploy Services

1. Click **"Apply"** to create both services
2. Wait for backend to deploy first (5-10 minutes)
3. Copy the backend URL (e.g., `https://shop-backend.onrender.com`)
4. Update frontend environment variable:
   - Go to `shop-frontend` service → Environment
   - Set `REACT_APP_BACKEND_URL` to `https://shop-backend.onrender.com/api`
5. Trigger frontend rebuild

### Step 5: Update CORS Settings

After frontend is deployed:

1. Copy frontend URL (e.g., `https://shop-frontend.onrender.com`)
2. Go to backend service → Environment
3. Update `CORS_ORIGINS` to your frontend URL
4. Trigger backend rebuild

## 🔧 Alternative: Manual Deployment (Without Blueprint)

If you prefer to deploy services individually:

### Deploy Backend Manually

1. Go to Render Dashboard → **"New +"** → **"Web Service"**
2. Connect GitHub repository
3. Configure:
   - **Name**: `shop-backend`
   - **Environment**: `Python 3`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (see table above)
5. Click **"Create Web Service"**

### Deploy Frontend Manually

1. Go to Render Dashboard → **"New +"** → **"Static Site"**
2. Connect GitHub repository
3. Configure:
   - **Name**: `shop-frontend`
   - **Branch**: `main`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/build`
4. Add environment variable:
   - `REACT_APP_BACKEND_URL`: `https://shop-backend.onrender.com/api`
5. Click **"Create Static Site"**

## 🐛 Troubleshooting

### Error: "invalid service property: url"

**Solution**: This has been fixed in the updated `render.yaml`. Make sure you've pushed the latest changes:

```bash
git pull origin main
git add render.yaml
git commit -m "Fix render.yaml"
git push origin main
```

### Error: "Build failed"

**Common causes**:
- Missing dependencies in `requirements.txt`
- Wrong Python version
- Incorrect build command

**Solution**: Check build logs in Render dashboard

### Error: "Application failed to respond"

**Common causes**:
- Wrong start command
- Port not set to `$PORT`
- Environment variables not set

**Solution**: Verify start command uses `--port $PORT`

### Error: "CORS policy blocked"

**Solution**: Update `CORS_ORIGINS` in backend to include frontend URL

### Frontend can't connect to backend

**Solution**: 
1. Verify `REACT_APP_BACKEND_URL` is set correctly
2. Make sure it includes `/api` at the end
3. Rebuild frontend after changing environment variables

## 📊 Expected Deployment Times

- **Backend**: 5-10 minutes (first deploy)
- **Frontend**: 3-5 minutes (first deploy)
- **Subsequent deploys**: 2-3 minutes

## 🔒 Security Recommendations

After deployment:

1. **Update CORS**: Change `CORS_ORIGINS` from `*` to your specific frontend URL
2. **MongoDB IP Whitelist**: Add Render's IP ranges or use `0.0.0.0/0`
3. **Environment Variables**: Never commit `.env` files to Git
4. **JWT Secret**: Use Render's auto-generated value

## 💰 Free Tier Limitations

Render.com free tier includes:

- ✅ 750 hours/month of runtime
- ✅ Automatic HTTPS
- ✅ Continuous deployment from Git
- ⚠️ Services spin down after 15 minutes of inactivity
- ⚠️ Cold start time: 30-60 seconds

## 🎉 Post-Deployment

Once deployed, your app will be available at:

- **Backend API**: `https://shop-backend.onrender.com`
- **Frontend**: `https://shop-frontend.onrender.com`
- **API Docs**: `https://shop-backend.onrender.com/docs`

## 📝 Deployment Checklist

- [ ] Push latest code to GitHub
- [ ] Create Render account
- [ ] Deploy using Blueprint or manual method
- [ ] Set all environment variables
- [ ] Wait for backend to deploy
- [ ] Update frontend with backend URL
- [ ] Test the deployed application
- [ ] Update CORS settings
- [ ] Verify MongoDB connection
- [ ] Test API endpoints
- [ ] Test frontend functionality

## 🔗 Useful Links

- **Render Dashboard**: https://dashboard.render.com
- **Render Docs**: https://render.com/docs
- **Your Repository**: https://github.com/LAKSHMINARASIMHATM/shopping-app
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Gemini API**: https://makersuite.google.com/app/apikey

---

**Need Help?** Check Render's build logs for detailed error messages.
