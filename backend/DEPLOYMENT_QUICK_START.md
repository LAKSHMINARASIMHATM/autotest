# 🚀 Quick Deployment Guide

## Vercel + PythonAnywhere Deployment

Deploy your shopping assistant app for **FREE** - no credit card required!

---

## 📋 Overview

- **Frontend**: Vercel (React app)
- **Backend**: PythonAnywhere (FastAPI)
- **Database**: MongoDB Atlas (already configured)
- **Cost**: $0 forever!

---

## ⚡ Quick Start (30 minutes)

### Part 1: Deploy Frontend (10 minutes)

1. **Create Vercel account**: https://vercel.com (sign up with GitHub)
2. **Import project**: Select `shopping-app` repository
3. **Configure**:
   - Root Directory: `frontend`
   - Framework: Create React App
4. **Add environment variable**:
   - `REACT_APP_BACKEND_URL` = `https://yourusername.pythonanywhere.com/api`
5. **Deploy**: Click deploy and wait 2-3 minutes

✅ **Frontend live at**: `https://shopping-app-xxx.vercel.app`

**Detailed guide**: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)

---

### Part 2: Deploy Backend (20 minutes)

1. **Create PythonAnywhere account**: https://www.pythonanywhere.com (free tier)
2. **Clone repository**:
   ```bash
   git clone https://github.com/LAKSHMINARASIMHATM/shopping-app.git
   cd shopping-app/backend
   ```
3. **Create virtual environment**:
   ```bash
   mkvirtualenv --python=/usr/bin/python3.10 myenv
   pip install -r requirements.txt
   ```
4. **Create `.env` file**:
   ```env
   MONGO_URL=mongodb+srv://simha:narasimha@cluster0.nmaqxhm.mongodb.net/?appName=Cluster0
   DB_NAME=shop_assistant
   JWT_SECRET=your-secret-key
   GEMINI_API_KEY=your-api-key
   CORS_ORIGINS=https://shopping-app-xxx.vercel.app
   ```
5. **Create web app**: Manual configuration → Python 3.10
6. **Configure WSGI file**:
   ```python
   import sys
   import os
   from dotenv import load_dotenv
   
   project_home = '/home/yourusername/shopping-app/backend'
   if project_home not in sys.path:
       sys.path.insert(0, project_home)
   
   load_dotenv(os.path.join(project_home, '.env'))
   
   from server import app as application
   ```
7. **Set virtual environment**: `/home/yourusername/.virtualenvs/myenv`
8. **Reload web app**

✅ **Backend live at**: `https://yourusername.pythonanywhere.com`

**Detailed guide**: [PYTHONANYWHERE_DEPLOYMENT.md](PYTHONANYWHERE_DEPLOYMENT.md)

---

## 🔗 Connect Frontend & Backend

### Update Frontend Environment Variable

1. Go to Vercel project → Settings → Environment Variables
2. Update `REACT_APP_BACKEND_URL`:
   ```
   https://yourusername.pythonanywhere.com/api
   ```
3. Redeploy frontend

### Update Backend CORS

1. Edit `.env` on PythonAnywhere:
   ```env
   CORS_ORIGINS=https://shopping-app-xxx.vercel.app
   ```
2. Reload web app

---

## 🧪 Test Your Deployment

### Test Backend

1. Visit: `https://yourusername.pythonanywhere.com/docs`
2. Try the `/api/health` endpoint (if available)
3. Test user registration

### Test Frontend

1. Visit: `https://shopping-app-xxx.vercel.app`
2. Try to register a new user
3. Upload a bill
4. Check price comparisons

---

## 📊 Your Live URLs

After deployment, you'll have:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | `https://shopping-app-xxx.vercel.app` | User interface |
| Backend API | `https://yourusername.pythonanywhere.com` | API server |
| API Docs | `https://yourusername.pythonanywhere.com/docs` | Interactive API docs |
| MongoDB | `cluster0.nmaqxhm.mongodb.net` | Database |

---

## 🐛 Common Issues

### Frontend can't connect to backend

**Solution**: 
1. Check `REACT_APP_BACKEND_URL` in Vercel
2. Verify backend is running on PythonAnywhere
3. Check CORS settings in backend `.env`

### Backend shows "Something went wrong"

**Solution**:
1. Check error logs on PythonAnywhere (Web tab → Error log)
2. Verify WSGI file syntax
3. Ensure virtual environment is activated

### MongoDB connection failed

**Solution**:
1. Check MongoDB Atlas Network Access (whitelist `0.0.0.0/0`)
2. Verify `MONGO_URL` in `.env` is correct
3. Test connection in PythonAnywhere console

---

## 🎉 Success Checklist

### Frontend (Vercel)
- [ ] Account created
- [ ] Project deployed
- [ ] Environment variables set
- [ ] Site accessible

### Backend (PythonAnywhere)
- [ ] Account created
- [ ] Code uploaded
- [ ] Dependencies installed
- [ ] `.env` configured
- [ ] WSGI file configured
- [ ] Web app running
- [ ] API docs accessible

### Integration
- [ ] Frontend connected to backend
- [ ] CORS configured
- [ ] User registration works
- [ ] Bill upload works
- [ ] Price comparison works

---

## 📚 Detailed Guides

- **[Vercel Deployment](VERCEL_DEPLOYMENT.md)** - Complete frontend deployment guide
- **[PythonAnywhere Deployment](PYTHONANYWHERE_DEPLOYMENT.md)** - Complete backend deployment guide
- **[MongoDB Setup](MONGODB_SETUP.md)** - Database configuration
- **[Free Deployment Options](FREE_DEPLOYMENT_OPTIONS.md)** - Alternative platforms

---

## 💡 Tips

### Free Tier Limitations

**Vercel:**
- ✅ Unlimited bandwidth
- ✅ Automatic HTTPS
- ✅ 100 GB-hours/month

**PythonAnywhere:**
- ⚠️ 100 CPU seconds/day
- ⚠️ 512 MB disk space
- ⚠️ App sleeps after inactivity (manual restart needed)

### Keeping Backend Alive

PythonAnywhere free tier may sleep. To keep it active:

1. Use a monitoring service (e.g., UptimeRobot)
2. Ping your API every 5 minutes
3. Or upgrade to paid tier ($5/month)

---

## 🔄 Updating Your App

### Update Frontend

```bash
# Make changes
cd frontend
# Edit files...

# Push to GitHub
git add .
git commit -m "Update frontend"
git push origin main

# Vercel auto-deploys!
```

### Update Backend

```bash
# SSH to PythonAnywhere
cd ~/shopping-app
git pull origin main

# Reload web app from Web tab
```

---

## 🎊 You're Done!

Your shopping assistant app is now live and accessible worldwide!

**Share your app:**
- Frontend: `https://shopping-app-xxx.vercel.app`
- API Docs: `https://yourusername.pythonanywhere.com/docs`

---

## 🆘 Need Help?

- **Vercel Issues**: Check [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) troubleshooting section
- **PythonAnywhere Issues**: Check [PYTHONANYWHERE_DEPLOYMENT.md](PYTHONANYWHERE_DEPLOYMENT.md) troubleshooting section
- **MongoDB Issues**: Check [MONGODB_SETUP.md](MONGODB_SETUP.md)

---

**Happy deploying! 🚀**
