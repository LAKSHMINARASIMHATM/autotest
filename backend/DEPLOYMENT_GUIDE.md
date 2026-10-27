# Deployment Guide: Shopping Assistant

This guide will help you deploy your full-stack shopping assistant application to Render.com.

## Prerequisites

- GitHub account
- Render.com account (free tier available)
- MongoDB Atlas account (free tier available)
- Your Gemini API key

---

## Step 1: Set Up MongoDB Atlas (Cloud Database)

Since Render doesn't support local MongoDB, you need a cloud database.

### 1.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for a free account
3. Create a new cluster (choose the **FREE** M0 tier)

### 1.2 Configure Database Access
1. In Atlas dashboard, go to **Database Access**
2. Click **Add New Database User**
3. Create a username and password (save these!)
4. Set privileges to **Read and write to any database**

### 1.3 Configure Network Access
1. Go to **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (0.0.0.0/0)
4. Confirm

### 1.4 Get Connection String
1. Go to **Database** → **Connect**
2. Choose **Connect your application**
3. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with your credentials
5. Save this connection string - you'll need it for Render!

---

## Step 2: Push Code to GitHub

### 2.1 Initialize Git Repository
```bash
cd d:\shop-main
git init
git add .
git commit -m "Initial commit - Shopping Assistant"
```

### 2.2 Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., `shopping-assistant`)
3. **Don't** initialize with README (we already have code)

### 2.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/shopping-assistant.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Render

### 3.1 Create Render Account
1. Go to https://render.com
2. Sign up (you can use GitHub to sign in)

### 3.2 Deploy Using Blueprint
1. In Render dashboard, click **New** → **Blueprint**
2. Connect your GitHub repository
3. Render will detect the `render.yaml` file automatically
4. Click **Apply**

### 3.3 Configure Environment Variables

Render will create two services:
- `shop-backend` (Python web service)
- `shop-frontend` (Static site)

#### For `shop-backend`:
1. Click on the backend service
2. Go to **Environment** tab
3. Add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `MONGO_URL` | Your MongoDB Atlas connection string | From Step 1.4 |
| `GEMINI_API_KEY` | Your Gemini API key | From earlier setup |
| `DB_NAME` | `shopping_assistant` | Database name |
| `CORS_ORIGINS` | `*` | Will update after frontend deploys |
| `JWT_SECRET` | (auto-generated) | Already set by render.yaml |

4. Click **Save Changes**

#### For `shop-frontend`:
The `REACT_APP_BACKEND_URL` is automatically injected from the backend service URL!

---

## Step 4: Wait for Deployment

1. Render will start building both services
2. Backend build takes ~5-10 minutes (installing dependencies)
3. Frontend build takes ~3-5 minutes
4. Monitor the logs for any errors

---

## Step 5: Get Your URLs

Once deployed:

### Backend URL
- Go to your backend service in Render
- Copy the URL (e.g., `https://shop-backend.onrender.com`)

### Frontend URL
- Go to your frontend service in Render
- Copy the URL (e.g., `https://shop-frontend.onrender.com`)

---

## Step 6: Update CORS (Optional but Recommended)

For better security:

1. Go to backend service → **Environment**
2. Update `CORS_ORIGINS` from `*` to your frontend URL:
   ```
   https://shop-frontend.onrender.com
   ```
3. Save and redeploy

---

## Step 7: Test Your Application

1. Visit your frontend URL
2. Try these features:
   - Sign up / Login
   - Upload a bill
   - Check if items are categorized (Gemini AI)
   - Generate a shopping list
   - View price comparisons

---

## Troubleshooting

### Backend Build Fails
- **Check logs** in Render dashboard
- Common issues:
  - Missing environment variables
  - Dependency conflicts (check `requirements.txt`)

### Frontend Can't Connect to Backend
- Verify `REACT_APP_BACKEND_URL` is set correctly
- Check backend service is running
- Check CORS settings

### MongoDB Connection Error
- Verify connection string is correct
- Check MongoDB Atlas network access allows 0.0.0.0/0
- Ensure database user has correct permissions

### Gemini API Errors
- Verify `GEMINI_API_KEY` is set
- Check API key is valid at https://makersuite.google.com/app/apikey
- Monitor rate limits (60 requests/minute on free tier)

---

## Free Tier Limitations

### Render.com Free Tier
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 750 hours/month of runtime

### MongoDB Atlas Free Tier
- 512 MB storage
- Shared RAM
- Sufficient for development/testing

### Gemini API Free Tier
- 60 requests/minute
- 1,500 requests/day
- Sufficient for normal usage

---

## Next Steps

1. **Custom Domain**: Add your own domain in Render settings
2. **Monitoring**: Set up health checks and alerts
3. **Scaling**: Upgrade to paid tier for better performance
4. **CI/CD**: Enable auto-deploy on GitHub pushes

---

## Support

If you encounter issues:
1. Check Render logs
2. Check MongoDB Atlas logs
3. Review environment variables
4. Verify all services are running

Your application is now live! 🚀
