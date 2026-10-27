# 🚀 Quick Start Guide - MongoDB Setup

## ✅ What I've Done

I've configured your shopping assistant app to work with your MongoDB Atlas cluster. Here's what's been set up:

### 📁 Files Created/Updated:

1. **`.env.example`** - Template for environment variables
2. **`MONGODB_SETUP.md`** - Detailed setup instructions
3. **`test_mongodb.py`** - Connection test script
4. **`requirements.txt`** - Added missing `authlib` dependency

## 🎯 Next Steps (Do This Now!)

### Step 1: Create Your `.env` File

Create a file named `.env` in the `backend` folder with this content:

```env
# MongoDB Configuration
MONGO_URL=mongodb+srv://simha:narasimha@cluster0.nmaqxhm.mongodb.net/?appName=Cluster0
DB_NAME=shop_assistant

# JWT Secret (IMPORTANT: Change this!)
JWT_SECRET=change-this-to-a-random-secure-string-for-production

# Google Gemini API (Required for AI features)
GEMINI_API_KEY=your-gemini-api-key-here
```

### Step 2: Get a Gemini API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy it and paste it in your `.env` file as `GEMINI_API_KEY`

### Step 3: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 4: Test MongoDB Connection

```bash
cd backend
python test_mongodb.py
```

You should see:
```
✅ Connection successful!
✅ All tests passed! Your MongoDB connection is working!
```

### Step 5: Start the Backend Server

```bash
cd backend
python -m uvicorn server:app --reload
```

The server will start at: http://localhost:8000

### Step 6: View API Documentation

Open your browser and go to:
- **API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## 📊 Your MongoDB Configuration

- **Connection String**: `mongodb+srv://simha:narasimha@cluster0.nmaqxhm.mongodb.net/?appName=Cluster0`
- **Username**: `simha`
- **Password**: `narasimha`
- **Cluster**: `cluster0.nmaqxhm.mongodb.net`
- **Database**: `shop_assistant` (will be created automatically)

### Collections (Created Automatically):
- `users` - User accounts and authentication
- `bills` - Uploaded bills and OCR data
- `shopping_lists` - Generated shopping lists

## 🔧 Important MongoDB Atlas Settings

Make sure your MongoDB Atlas cluster has:

1. **Network Access** - Whitelist your IP address:
   - Go to MongoDB Atlas → Network Access
   - Click "Add IP Address"
   - Either add your current IP or use `0.0.0.0/0` for development (allows all IPs)

2. **Database User** - Verify credentials:
   - Username: `simha`
   - Password: `narasimha`
   - Permissions: Read and write to any database

## ⚠️ Troubleshooting

### "Connection Timeout" Error
- Check if your IP is whitelisted in MongoDB Atlas
- Try adding `0.0.0.0/0` to allow all IPs (for development only)

### "Authentication Failed" Error
- Verify username is `simha` and password is `narasimha`
- Check user permissions in MongoDB Atlas

### "Module Not Found" Error
- Run: `pip install -r requirements.txt`

## 🎨 Frontend Setup

Don't forget to configure your frontend to connect to the backend:

1. Go to `frontend` folder
2. Create/update `.env.local`:
```env
REACT_APP_API_URL=http://localhost:8000/api
```

3. Install dependencies and start:
```bash
cd frontend
npm install
npm start
```

## 📝 Environment Variables Reference

### Required:
- `MONGO_URL` - MongoDB connection string ✅
- `DB_NAME` - Database name ✅
- `JWT_SECRET` - Secret for JWT tokens ⚠️ (Change the default!)
- `GEMINI_API_KEY` - Google Gemini API key ⚠️ (Get from Google)

### Optional (for OAuth login):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### Optional (for affiliate links):
- `AMAZON_AFFILIATE_TAG`
- `FLIPKART_AFFILIATE_ID`
- `MEESHO_AFFILIATE_ID`

## 🚀 Ready to Go!

Once you've completed the steps above, your app will be fully connected to MongoDB and ready to use!

### Test the Complete Flow:

1. Register a new user: `POST http://localhost:8000/api/auth/register`
2. Login: `POST http://localhost:8000/api/auth/login`
3. Upload a bill: `POST http://localhost:8000/api/bills/upload`
4. Generate shopping list: `POST http://localhost:8000/api/shopping-list/generate`

All data will be stored in your MongoDB Atlas cluster!

## 📚 Additional Resources

- **MongoDB Setup Guide**: See `MONGODB_SETUP.md` for detailed instructions
- **API Documentation**: http://localhost:8000/docs (after starting server)
- **Deployment Guide**: See `DEPLOYMENT_GUIDE.md` for production deployment

---

**Need Help?** Check the troubleshooting section in `MONGODB_SETUP.md` or run `python test_mongodb.py` to diagnose connection issues.
