# 🐍 PythonAnywhere Deployment Guide (Backend)

## ✅ Overview

Deploy your FastAPI backend to PythonAnywhere - completely free, no credit card required!

**What you'll get:**
- ✅ Free hosting forever
- ✅ Automatic HTTPS
- ✅ Python 3.10 support
- ✅ 512MB disk space
- ✅ Always-on web app

---

## 📋 Prerequisites

- [ ] PythonAnywhere account (we'll create this)
- [x] Backend code ready
- [x] MongoDB Atlas configured
- [x] Gemini API key

---

## 🎯 Step-by-Step Deployment

### Step 1: Create PythonAnywhere Account

1. Go to **https://www.pythonanywhere.com**
2. Click **"Pricing & signup"**
3. Choose **"Create a Beginner account"** (FREE)
4. Fill in:
   - Username (e.g., `lakshminarasimha`)
   - Email
   - Password
5. Verify your email
6. Login to your account

**No credit card required!** ✅

---

### Step 2: Upload Your Code

#### Option A: Using Git (Recommended)

1. Open a **Bash console** (from Dashboard → "Consoles")
2. Clone your repository:
   ```bash
   git clone https://github.com/LAKSHMINARASIMHATM/shopping-app.git
   cd shopping-app/backend
   ```

#### Option B: Upload Files Manually

1. Go to **"Files"** tab
2. Navigate to `/home/yourusername/`
3. Create folder: `shopping-app`
4. Upload all backend files

---

### Step 3: Install Dependencies

1. Open a **Bash console**
2. Navigate to your backend directory:
   ```bash
   cd ~/shopping-app/backend
   ```

3. Create a virtual environment:
   ```bash
   mkvirtualenv --python=/usr/bin/python3.10 myenv
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

**Note:** This may take 5-10 minutes. Some packages like `torch` are large.

---

### Step 4: Create Environment Variables

1. In the Bash console, create `.env` file:
   ```bash
   cd ~/shopping-app/backend
   nano .env
   ```

2. Add your environment variables:
   ```env
   MONGO_URL=mongodb+srv://simha:narasimha@cluster0.nmaqxhm.mongodb.net/?appName=Cluster0
   DB_NAME=shop_assistant
   JWT_SECRET=your-super-secret-jwt-key-change-this
   GEMINI_API_KEY=your-gemini-api-key-here
   CORS_ORIGINS=https://shopping-app-xxx.vercel.app
   ```

3. Save and exit:
   - Press `Ctrl + X`
   - Press `Y` to confirm
   - Press `Enter`

---

### Step 5: Create Web App

1. Go to **"Web"** tab
2. Click **"Add a new web app"**
3. Choose your domain: `yourusername.pythonanywhere.com`
4. Select **"Manual configuration"**
5. Choose **Python 3.10**
6. Click **"Next"**

---

### Step 6: Configure WSGI File

This is the most important step!

1. On the Web tab, scroll to **"Code"** section
2. Click on the WSGI configuration file link (e.g., `/var/www/yourusername_pythonanywhere_com_wsgi.py`)
3. **Delete all existing content**
4. Replace with this configuration:

```python
import sys
import os
from dotenv import load_dotenv

# Add your project directory to the sys.path
project_home = '/home/yourusername/shopping-app/backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Load environment variables
load_dotenv(os.path.join(project_home, '.env'))

# Import your FastAPI app
from server import app as application
```

**IMPORTANT:** Replace `yourusername` with your actual PythonAnywhere username!

5. Click **"Save"**

---

### Step 7: Configure Virtual Environment

1. Still on the **"Web"** tab
2. Scroll to **"Virtualenv"** section
3. Enter the path to your virtual environment:
   ```
   /home/yourusername/.virtualenvs/myenv
   ```
4. Click the checkmark to save

---

### Step 8: Set Working Directory

1. On the **"Web"** tab
2. Scroll to **"Code"** section
3. Set **"Working directory"** to:
   ```
   /home/yourusername/shopping-app/backend
   ```

---

### Step 9: Reload Web App

1. Scroll to the top of the **"Web"** tab
2. Click the big green **"Reload"** button
3. Wait for the reload to complete

---

### Step 10: Test Your API

1. Your API is now live at:
   ```
   https://yourusername.pythonanywhere.com
   ```

2. Test the API documentation:
   ```
   https://yourusername.pythonanywhere.com/docs
   ```

3. Test a simple endpoint:
   ```
   https://yourusername.pythonanywhere.com/api/health
   ```

---

## 🔧 Advanced Configuration

### Enable ASGI (for WebSockets)

If you need WebSocket support:

1. Edit WSGI file to use ASGI:
```python
import sys
import os
from dotenv import load_dotenv

project_home = '/home/yourusername/shopping-app/backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

load_dotenv(os.path.join(project_home, '.env'))

from server import app

# ASGI application
application = app
```

---

### Static Files (if needed)

If you need to serve static files:

1. On **"Web"** tab, scroll to **"Static files"**
2. Add mapping:
   - URL: `/static/`
   - Directory: `/home/yourusername/shopping-app/backend/static/`

---

### Custom Domain (Paid Feature)

Free tier uses `yourusername.pythonanywhere.com`. Custom domains require paid plan.

---

## 🐛 Troubleshooting

### Error: "Something went wrong"

**Check error logs:**

1. Go to **"Web"** tab
2. Scroll to **"Log files"**
3. Click on **"Error log"**
4. Look for error messages

**Common fixes:**
- Check WSGI file syntax
- Verify virtual environment path
- Ensure all dependencies are installed

---

### Error: "Module not found"

**Solution:**

1. Open Bash console
2. Activate virtual environment:
   ```bash
   workon myenv
   ```
3. Install missing package:
   ```bash
   pip install package-name
   ```
4. Reload web app

---

### Error: "Connection to MongoDB failed"

**Solution:**

1. Check `.env` file has correct `MONGO_URL`
2. Verify MongoDB Atlas allows connections from `0.0.0.0/0`
3. Test connection in Bash console:
   ```bash
   workon myenv
   python
   >>> from motor.motor_asyncio import AsyncIOMotorClient
   >>> import os
   >>> from dotenv import load_dotenv
   >>> load_dotenv()
   >>> client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
   >>> # Should not error
   ```

---

### Error: "CORS policy blocked"

**Solution:**

1. Update `.env` file with your Vercel URL:
   ```env
   CORS_ORIGINS=https://shopping-app-xxx.vercel.app
   ```
2. Reload web app

---

### Slow Performance

**Free tier limitations:**
- Limited CPU seconds per day
- Shared resources
- No guaranteed uptime

**Solutions:**
- Optimize database queries
- Cache frequently accessed data
- Consider upgrading to paid tier if needed

---

## 📊 Monitoring

### View Logs

1. **Error log**: Shows Python errors
2. **Server log**: Shows HTTP requests
3. **Access log**: Shows all requests

Access from **"Web"** tab → **"Log files"**

---

### Check CPU Usage

1. Go to **"Account"** tab
2. View **"CPU seconds used today"**
3. Free tier: 100 CPU seconds/day

---

## 🔄 Updating Your Code

### Using Git

```bash
# SSH into PythonAnywhere console
cd ~/shopping-app
git pull origin main
cd backend

# Reinstall dependencies if needed
workon myenv
pip install -r requirements.txt

# Reload from Web tab
```

### Manual Update

1. Upload changed files via **"Files"** tab
2. Click **"Reload"** on **"Web"** tab

---

## 🔒 Security Best Practices

### Environment Variables
- ✅ Never commit `.env` to Git
- ✅ Use strong JWT_SECRET
- ✅ Restrict CORS to specific domains

### MongoDB
- ✅ Use strong passwords
- ✅ Whitelist specific IPs (or `0.0.0.0/0` for testing)
- ✅ Use MongoDB Atlas (not local MongoDB)

### API Keys
- ✅ Keep Gemini API key secret
- ✅ Monitor API usage
- ✅ Set usage limits if possible

---

## 📈 Performance Tips

### Optimize Imports

```python
# In server.py, import only what you need
from fastapi import FastAPI, HTTPException
# Instead of: from fastapi import *
```

### Use Async Properly

```python
# Good: Async database calls
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    return user

# Bad: Blocking calls in async function
async def bad_function():
    time.sleep(5)  # Blocks the event loop!
```

### Cache Results

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_platform_prices(item_name: str):
    # Expensive operation
    return prices
```

---

## 🎉 Success Checklist

- [ ] PythonAnywhere account created
- [ ] Code uploaded via Git or manually
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] `.env` file configured
- [ ] Web app created
- [ ] WSGI file configured
- [ ] Virtual environment path set
- [ ] Web app reloaded
- [ ] API accessible at `yourusername.pythonanywhere.com`
- [ ] `/docs` endpoint working
- [ ] MongoDB connection successful
- [ ] Vercel frontend updated with backend URL

---

## 🔗 Useful Links

- **PythonAnywhere Dashboard**: https://www.pythonanywhere.com/user/yourusername/
- **Documentation**: https://help.pythonanywhere.com/
- **Forums**: https://www.pythonanywhere.com/forums/
- **Your API**: https://yourusername.pythonanywhere.com

---

## 📱 Next Steps

1. ✅ Backend deployed on PythonAnywhere
2. ⏭️ Update Vercel frontend with backend URL
3. 🧪 Test complete application
4. 🎉 Share your app!

---

**Your backend is now live! 🎉**

API Documentation: `https://yourusername.pythonanywhere.com/docs`
