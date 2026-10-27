# 🛍️ Smart Shopping Assistant

An AI-powered shopping assistant that helps you save money by analyzing bills, comparing prices, and generating smart shopping lists.

##  Features

- ** Bill Scanning**: Upload bills and extract items using OCR
- ** AI Analysis**: Powered by Google Gemini for intelligent item categorization
- ** Price Comparison**: Compare prices across 9+ e-commerce platforms
- ** Spending Insights**: Track your spending patterns and get insights
- ** Smart Shopping Lists**: Generate optimized shopping lists within budget
- ** Secure Authentication**: Email/password and OAuth (Google, GitHub) login

##  Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - Database for storing user data and bills
- **EasyOCR** - Optical character recognition for bill scanning
- **Google Gemini** - AI for item categorization and analysis
- **Motor** - Async MongoDB driver

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Axios** - HTTP client

##  Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- MongoDB Atlas account
- Google Gemini API key

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```


3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Test MongoDB connection**:
   ```bash
   python test_mongodb.py
   ```

5. **Start the server**:
   ```bash
   python -m uvicorn server:app --reload
   ```

   Server will run at: http://localhost:8000

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env.local`**:
   ```env
   REACT_APP_API_URL=http://localhost:8000/api
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

   App will open at: http://localhost:3000

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get started quickly
- **[Git Setup](GIT_SETUP.md)** - Git authentication and push instructions
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Deploy to production

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/github` - GitHub OAuth login

### Bills
- `POST /api/bills/upload` - Upload and analyze bill
- `GET /api/bills` - Get user's bills
- `GET /api/bills/{bill_id}` - Get specific bill

### Shopping Lists
- `POST /api/shopping-list/generate` - Generate shopping list
- `GET /api/shopping-lists` - Get user's shopping lists

### Insights
- `GET /api/insights` - Get spending insights

## 🌐 Supported Platforms

Price comparison across:
- Amazon India
- Flipkart
- Meesho
- BigBasket
- JioMart
- Blinkit (10-15 min delivery)
- Zepto (10 min delivery)
- Swiggy Instamart (15-20 min delivery)
- Dunzo (20-30 min delivery)

## 🔒 Environment Variables

### Required
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret for JWT tokens
- `GEMINI_API_KEY` - Google Gemini API key

### Optional (OAuth)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### Optional (Affiliate Links)
- `AMAZON_AFFILIATE_TAG`
- `FLIPKART_AFFILIATE_ID`
- `MEESHO_AFFILIATE_ID`

## 🧪 Testing

### Test MongoDB Connection
```bash
cd backend
python test_mongodb.py
```

### API Documentation
Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🚀 Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ by LAKSHMINARASIMHATM**
