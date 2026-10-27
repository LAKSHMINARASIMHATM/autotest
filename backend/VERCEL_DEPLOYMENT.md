# 🚀 Vercel Deployment Guide (Frontend)

## ✅ Overview

Deploy your React frontend to Vercel - completely free, no credit card required!

**What you'll get:**
- ✅ Free hosting forever
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments from GitHub
- ✅ Custom domain support (optional)

---

## 📋 Prerequisites

- [x] GitHub account
- [x] Code pushed to GitHub repository
- [ ] Vercel account (we'll create this)
- [ ] Backend deployed on PythonAnywhere (or backend URL ready)

---

## 🎯 Step-by-Step Deployment

### Step 1: Create Vercel Account

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account
5. Complete the signup process

**No credit card required!** ✅

---

### Step 2: Import Your Project

1. On Vercel Dashboard, click **"Add New..."** → **"Project"**
2. Click **"Import Git Repository"**
3. Find and select: **`LAKSHMINARASIMHATM/shopping-app`**
4. Click **"Import"**

---

### Step 3: Configure Build Settings

Vercel will auto-detect your React app. Configure these settings:

#### Framework Preset
- **Framework**: `Create React App` (auto-detected)

#### Root Directory
- Click **"Edit"** next to Root Directory
- Set to: **`frontend`**
- This tells Vercel where your React app is located

#### Build and Output Settings
- **Build Command**: `npm run build` (auto-filled)
- **Output Directory**: `build` (auto-filled)
- **Install Command**: `npm install` (auto-filled)

---

### Step 4: Add Environment Variables

**IMPORTANT:** Before deploying, add your backend URL.

1. Expand **"Environment Variables"** section
2. Add the following variable:

| Name | Value |
|------|-------|
| `REACT_APP_BACKEND_URL` | `https://yourusername.pythonanywhere.com/api` |

**Note:** Replace `yourusername` with your PythonAnywhere username. If you haven't deployed the backend yet, you can add this later and redeploy.

**How to add:**
- Key: `REACT_APP_BACKEND_URL`
- Value: Your backend URL (from PythonAnywhere)
- Environment: Select all (Production, Preview, Development)
- Click **"Add"**

---

### Step 5: Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. You'll see a success screen with your live URL!

**Your app will be live at:**
```
https://shopping-app-xxx.vercel.app
```

---

## 🔧 Post-Deployment Configuration

### Update Backend CORS

Once your frontend is deployed, update your backend's CORS settings:

1. Go to your PythonAnywhere backend
2. Update `.env` file:
   ```env
   CORS_ORIGINS=https://shopping-app-xxx.vercel.app
   ```
3. Reload your web app

---

### Custom Domain (Optional)

Want a custom domain like `myshop.com`?

1. Go to your project on Vercel
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Follow DNS configuration instructions
5. Vercel provides free SSL automatically!

---

## 🔄 Automatic Deployments

Every time you push to GitHub, Vercel automatically deploys!

```bash
# Make changes to your frontend
cd frontend
# Edit files...

# Commit and push
git add .
git commit -m "Update frontend"
git push origin main

# Vercel automatically deploys! 🚀
```

---

## 📊 Monitoring Your Deployment

### View Deployment Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Click on any deployment
4. View build logs and runtime logs

### Check Build Status

- ✅ **Ready**: Deployment successful
- 🔄 **Building**: Deployment in progress
- ❌ **Error**: Build failed (check logs)

---

## 🐛 Troubleshooting

### Build Failed

**Error**: `npm install` failed

**Solution**:
```bash
# Test locally first
cd frontend
npm install
npm run build

# If it works locally, push to GitHub
git add .
git commit -m "Fix build"
git push origin main
```

---

### Environment Variable Not Working

**Error**: Frontend can't connect to backend

**Solution**:
1. Go to Vercel project → **Settings** → **Environment Variables**
2. Verify `REACT_APP_BACKEND_URL` is set correctly
3. Make sure it starts with `https://`
4. Click **"Redeploy"** to rebuild with new variables

---

### 404 on Refresh

**Error**: Page not found when refreshing on routes like `/dashboard`

**Solution**: Vercel handles this automatically for Create React App, but if you have issues:

1. Create `vercel.json` in project root:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

2. Push to GitHub

---

## 📝 Vercel Configuration File (Optional)

Create `vercel.json` in your project root for advanced configuration:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "cache-control": "s-maxage=31536000, immutable"
      },
      "dest": "/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

---

## 🎨 Preview Deployments

Vercel creates preview deployments for every pull request!

1. Create a new branch:
   ```bash
   git checkout -b feature-new-ui
   ```

2. Make changes and push:
   ```bash
   git add .
   git commit -m "New UI design"
   git push origin feature-new-ui
   ```

3. Create a Pull Request on GitHub

4. Vercel automatically creates a preview URL!
   ```
   https://shopping-app-git-feature-new-ui-xxx.vercel.app
   ```

---

## 📊 Analytics (Optional)

Enable Vercel Analytics to track visitors:

1. Go to project → **Analytics**
2. Click **"Enable Analytics"**
3. Free tier includes basic analytics

---

## 🔒 Security Best Practices

### Environment Variables
- ✅ Never commit `.env` files
- ✅ Use Vercel's environment variables
- ✅ Different values for production/preview/development

### HTTPS
- ✅ Automatic HTTPS (Vercel provides free SSL)
- ✅ All traffic encrypted

### Headers
Add security headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 📈 Performance Optimization

### Image Optimization
Use Vercel's Image Optimization:

```jsx
import Image from 'next/image'

// If using Next.js
<Image src="/logo.png" width={200} height={100} />
```

### Caching
Vercel automatically caches static assets on their global CDN.

---

## 🎉 Success Checklist

- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Root directory set to `frontend`
- [ ] Environment variables configured
- [ ] Deployment successful
- [ ] Frontend accessible at Vercel URL
- [ ] Backend CORS updated with Vercel URL
- [ ] App tested and working

---

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Documentation**: https://vercel.com/docs
- **Your Project**: https://vercel.com/LAKSHMINARASIMHATM/shopping-app
- **Support**: https://vercel.com/support

---

## 📱 Next Steps

1. ✅ Frontend deployed on Vercel
2. ⏭️ Deploy backend on PythonAnywhere (see `PYTHONANYWHERE_DEPLOYMENT.md`)
3. 🔗 Connect frontend to backend
4. 🧪 Test the complete application

---

**Your frontend is now live! 🎉**

Next, let's deploy the backend on PythonAnywhere.
