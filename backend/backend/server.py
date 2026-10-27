from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, Header, Request
from fastapi.responses import JSONResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from authlib.integrations.starlette_client import OAuth, OAuthError
import io
from PIL import Image
import easyocr
import json
from urllib.parse import quote_plus
import google.generativeai as genai
import random

# Import price fetcher service
try:
    from services.price_fetcher import price_fetcher
    PRICE_FETCHER_AVAILABLE = True
    logging.info("Price fetcher service loaded successfully")
except ImportError as e:
    logging.warning(f"Price fetcher service not available: {e}")
    PRICE_FETCHER_AVAILABLE = False
    price_fetcher = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT & Password hashing
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-jwt-key')
JWT_ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Initialize EasyOCR reader (English)
reader = easyocr.Reader(['en'])

# OAuth Configuration
oauth = OAuth()

# Register Google OAuth
oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# Register GitHub OAuth
oauth.register(
    name='github',
    client_id=os.environ.get('GITHUB_CLIENT_ID'),
    client_secret=os.environ.get('GITHUB_CLIENT_SECRET'),
    access_token_url='https://github.com/login/oauth/access_token',
    authorize_url='https://github.com/login/oauth/authorize',
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'}
)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    oauth_provider: Optional[str] = None  # 'google', 'github', or None
    oauth_provider_id: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TokenResponse(BaseModel):
    token: str
    user: User

class OAuthProvider(BaseModel):
    provider: str  # 'google' or 'github'
    provider_user_id: str
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None

class ExtractedItem(BaseModel):
    name: str
    quantity: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None

class PlatformPrice(BaseModel):
    platform: str
    price: float
    url: Optional[str] = None
    savings: float

class PlatformRecommendation(BaseModel):
    platform: str
    reason: str
    score: float
    delivery_time: str

class ItemWithPrices(BaseModel):
    name: str
    category: str
    original_price: float
    platform_prices: List[PlatformPrice]
    best_price: float
    max_savings: float
    recommended_platforms: List[PlatformRecommendation] = []

class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_amount: float
    items: List[ExtractedItem]
    status: str = "completed"

class BillAnalysis(BaseModel):
    bill: Bill
    items_with_prices: List[ItemWithPrices]
    total_savings_potential: float

class ShoppingListItem(BaseModel):
    name: str
    category: str
    estimated_price: float
    quantity: str

class ShoppingList(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    budget: float
    items: List[ShoppingListItem]
    total_estimated: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SpendingInsights(BaseModel):
    total_spending: float
    category_breakdown: Dict[str, float]
    monthly_trend: List[Dict[str, Any]]
    top_categories: List[Dict[str, Any]]

# Category-Platform Preferences (for smart recommendations)
CATEGORY_PLATFORM_PREFERENCES = {
    "Groceries": ["BigBasket", "JioMart", "Blinkit", "Zepto"],
    "Fruits & Vegetables": ["BigBasket", "Swiggy Instamart", "Zepto", "Blinkit"],
    "Dairy": ["Blinkit", "Zepto", "BigBasket", "Swiggy Instamart"],
    "Snacks": ["Amazon", "Flipkart", "Meesho", "BigBasket"],
    "Beverages": ["BigBasket", "JioMart", "Blinkit", "Amazon"],
    "Cleaning": ["Amazon", "Flipkart", "BigBasket", "JioMart"],
    "Personal Care": ["Amazon", "Flipkart", "Meesho", "BigBasket"],
    "Electronics": ["Amazon", "Flipkart"],
    "Meat & Seafood": ["BigBasket", "Swiggy Instamart", "Blinkit"],
    "Bakery": ["Swiggy Instamart", "Blinkit", "Zepto", "BigBasket"],
    "Frozen Foods": ["BigBasket", "Swiggy Instamart", "JioMart"],
    "Other": ["Amazon", "Flipkart", "Meesho"]
}

# ============ HELPER FUNCTIONS ============

def auto_deskew_image(image):
    """Automatically detect and correct skew in image"""
    if not ENHANCED_OCR_AVAILABLE:
        return image
    
    try:
        angle = determine_skew(image)
        if angle and abs(angle) > 0.5:  # Only deskew if angle is significant
            rotated = imutils.rotate_bound(image, angle)
            return rotated
    except Exception as e:
        logger.warning(f"Deskew failed: {e}")
    return image

def ocr_with_tesseract(image):
    """Fallback OCR using Tesseract"""
    if not ENHANCED_OCR_AVAILABLE:
        return []
    
    try:
        # Use Tesseract for OCR
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        results = []
        
        n_boxes = len(data['text'])
        for i in range(n_boxes):
            if int(data['conf'][i]) > 25:  # Confidence threshold
                text = data['text'][i].strip()
                if text:
                    # Create bbox in EasyOCR format
                    x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                    bbox = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
                    conf = int(data['conf'][i]) / 100.0
                    results.append((bbox, text, conf))
        
        return results
    except Exception as e:
        logger.error(f"Tesseract OCR failed: {e}")
        return []

def convert_pdf_to_images(pdf_bytes):
    """Convert PDF to images for OCR processing"""
    if not ENHANCED_OCR_AVAILABLE:
        raise Exception("PDF support not available. Install pdf2image.")
    
    try:
        images = convert_from_bytes(pdf_bytes)
        return images
    except Exception as e:
        logger.error(f"PDF conversion failed: {e}")
        raise

async def call_gemini(prompt: str, system_message: str = None) -> str:
    """Call Google Gemini API with prompt"""
    try:
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise Exception("GEMINI_API_KEY not set in environment")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # Combine system message and prompt
        full_prompt = f"{system_message}\n\n{prompt}" if system_message else prompt
        
        # Generate content (synchronous call, but we're in async function)
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        raise

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def process_oauth_user(provider: str, user_info: dict) -> tuple[str, User]:
    """
    Process OAuth user data and return token and user object.
    Creates new user if doesn't exist, updates if exists.
    """
    email = user_info.get('email')
    provider_id = user_info.get('id') or user_info.get('sub')
    name = user_info.get('name', email.split('@')[0])
    avatar_url = user_info.get('picture') or user_info.get('avatar_url')
    
    if not email or not provider_id:
        raise HTTPException(status_code=400, detail="Invalid OAuth user data")
    
    # Check if user exists with this OAuth provider
    existing_user = await db.users.find_one({
        "oauth_provider": provider,
        "oauth_provider_id": str(provider_id)
    })
    
    if existing_user:
        # Update existing OAuth user
        user_dict = existing_user
        if isinstance(user_dict.get('created_at'), str):
            user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    else:
        # Check if email already exists (password user)
        email_user = await db.users.find_one({"email": email})
        
        if email_user and not email_user.get('oauth_provider'):
            # Link OAuth to existing password account
            await db.users.update_one(
                {"id": email_user['id']},
                {"$set": {
                    "oauth_provider": provider,
                    "oauth_provider_id": str(provider_id),
                    "avatar_url": avatar_url
                }}
            )
            user_dict = await db.users.find_one({"id": email_user['id']})
            if isinstance(user_dict.get('created_at'), str):
                user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
        else:
            # Create new OAuth user
            user_dict = User(
                name=name,
                email=email,
                oauth_provider=provider,
                oauth_provider_id=str(provider_id),
                avatar_url=avatar_url
            ).model_dump()
            
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            await db.users.insert_one(user_dict)
            user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    
    # Remove sensitive fields
    user_dict.pop('password_hash', None)
    user_dict.pop('_id', None)
    
    # Create token
    token = create_access_token({"user_id": user_dict['id']})
    
    return token, User(**user_dict)

async def categorize_items_with_llm(items: List[Dict[str, Any]]) -> List[ExtractedItem]:
    """Use LLM to categorize and structure extracted items"""
    try:
        system_message = "You are a smart shopping assistant. Your job is to categorize grocery and shopping items accurately."
        
        prompt = f"""
The following items were extracted from a shopping bill:
{json.dumps(items, indent=2)}

Please categorize each item into one of these categories: Dairy, Snacks, Beverages, Cleaning, Personal Care, Electronics, Groceries, Fruits & Vegetables, Meat & Seafood, Bakery, Frozen Foods, Other.

Also clean up the item names (remove extra spaces, fix spelling if obvious).

Return ONLY a JSON array with this structure:
[
  {{"name": "cleaned item name", "quantity": "extracted quantity", "price": price_as_number, "category": "category"}}
]

Do not include any explanation, just the JSON array.
"""
        
        response = await call_gemini(prompt, system_message)
        
        # Parse LLM response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        categorized = json.loads(response_text)
        return [ExtractedItem(**item) for item in categorized]
    
    except Exception as e:
        logger.error(f"LLM categorization failed: {e}")
        # Fallback: return items with default category
        return [
            ExtractedItem(
                name=item.get('name', 'Unknown'),
                quantity=item.get('quantity'),
                price=item.get('price'),
                category="Other"
            )
            for item in items
        ]

def get_smart_recommendations(
    category: str,
    platform_prices: List[PlatformPrice],
    platforms_config: Dict
) -> List[PlatformRecommendation]:
    """
    Generate smart platform recommendations based on:
    - Category-specific platform strengths
    - Price competitiveness
    - Delivery speed
    """
    recommendations = []
    
    # Get preferred platforms for this category
    preferred_platforms = CATEGORY_PLATFORM_PREFERENCES.get(category, CATEGORY_PLATFORM_PREFERENCES["Other"])
    
    # Find best price
    best_price = min(p.price for p in platform_prices)
    
    for platform_price in platform_prices:
        score = 0.0
        reasons = []
        
        # Category match (40% weight)
        if platform_price.platform in preferred_platforms[:3]:  # Top 3 for category
            category_score = 40.0 * (1 - (preferred_platforms.index(platform_price.platform) / 3))
            score += category_score
            reasons.append(f"Great for {category}")
        
        # Price competitiveness (30% weight)
        if platform_price.price == best_price:
            score += 30.0
            reasons.append("Best price")
        elif platform_price.price <= best_price * 1.05:  # Within 5% of best
            score += 20.0
            reasons.append("Competitive price")
        
        # Delivery speed (20% weight)
        delivery = platforms_config.get(platform_price.platform, {}).get('delivery', '')
        if 'min' in delivery:  # Quick delivery
            score += 20.0
            reasons.append(f"Fast delivery ({delivery})")
        elif 'Same Day' in delivery or 'Next Day' in delivery:
            score += 10.0
            reasons.append(f"{delivery} delivery")
        
        # Platform reliability (10% weight) - bonus for established platforms
        if platform_price.platform in ['Amazon', 'Flipkart', 'BigBasket']:
            score += 10.0
        
        if score > 0:
            recommendations.append(PlatformRecommendation(
                platform=platform_price.platform,
                reason=", ".join(reasons) if reasons else "Available",
                score=round(score, 1),
                delivery_time=delivery
            ))
    
    # Sort by score (highest first) and return top 3
    return sorted(recommendations, key=lambda x: x.score, reverse=True)[:3]

def generate_search_query(item_name: str, quantity: str, quantity_unit: str) -> str:
    """Generate quantity-aware search query for better e-commerce results"""
    
    # Clean up item name - remove special characters and extra spaces
    import re
    base_query = item_name.strip()
    
    # Remove common noise words that don't help search
    noise_words = ['the', 'a', 'an', 'of', 'for', 'with', 'and', '&']
    words = base_query.split()
    cleaned_words = [w for w in words if w.lower() not in noise_words]
    base_query = ' '.join(cleaned_words) if cleaned_words else base_query
    
    # Remove special characters except spaces and alphanumeric
    base_query = re.sub(r'[^\w\s]', '', base_query)
    base_query = re.sub(r'\s+', ' ', base_query).strip()
    
    # Add quantity-specific terms based on unit for better search results
    search_term = base_query
    
    if quantity_unit in ['kg', 'l']:
        # For bulk items, include the quantity for better matching
        qty_num = quantity.split()[0] if quantity.split() else '1'
        search_term = f"{base_query} {qty_num}{quantity_unit}"
    
    elif quantity_unit in ['g', 'ml']:
        # For specific weights/volumes, include them for precise matching
        qty_num = quantity.split()[0] if quantity.split() else ''
        if qty_num:
            search_term = f"{base_query} {qty_num}{quantity_unit}"
    
    elif quantity_unit in ['pcs', 'pc']:
        # For pieces, add pack terms if quantity is high
        try:
            qty_num = float(quantity.split()[0]) if quantity.split() else 1
            if qty_num >= 12:
                search_term = f"{base_query} dozen"
            elif qty_num >= 6:
                search_term = f"{base_query} pack"
        except (ValueError, IndexError):
            pass
    
    elif quantity_unit in ['pack', 'packet', 'box', 'bottle']:
        # For packaged items, add the packaging type
        search_term = f"{base_query} {quantity_unit}"
    
    # Return the cleaned search term (will be URL encoded by the calling function)
    return search_term.strip()

def normalize_quantity(quantity_str: str) -> str:
    """Normalize quantity units to standard format"""
    quantity_str = quantity_str.lower().strip()
    
    # Unit mappings for normalization
    unit_mappings = {
        'gram': 'g',
        'grams': 'g',
        'gm': 'g',
        'liter': 'l',
        'liters': 'l',
        'ltr': 'l',
        'milliliter': 'ml',
        'piece': 'pc',
        'pieces': 'pc',
        'pcs': 'pc',
        'doz': 'dozen',
        'dozen': 'dozen',
        'box': 'box',
        'bottle': 'bottle',
        'btl': 'bottle',
        'can': 'can',
        'tin': 'tin',
        'packet': 'packet',
        'pkt': 'packet'
    }
    
    # Extract number and unit
    import re
    match = re.match(r'(\d+(?:\.\d+)?)\s*([a-zA-Z]+)', quantity_str)
    if match:
        number = match.group(1)
        unit = match.group(2)
        
        # Normalize unit
        for full_form, short_form in unit_mappings.items():
            if unit.startswith(full_form):
                unit = short_form
                break
        
        return f"{number} {unit}"
    
    return quantity_str

def infer_quantity_from_name(item_name: str) -> str:
    """Infer quantity from common item name patterns"""
    item_name_lower = item_name.lower()
    
    # Common patterns for quantity inference
    patterns = [
        (r'milk.*?1l', '1 l'),
        (r'milk.*?500ml', '500 ml'),
        (r'milk.*?250ml', '250 ml'),
        (r'bread.*?400g', '400 g'),
        (r'bread.*?200g', '200 g'),
        (r'egg.*?12', '12 pcs'),
        (r'egg.*?6', '6 pcs'),
        (r'rice.*?1kg', '1 kg'),
        (r'rice.*?5kg', '5 kg'),
        (r'oil.*?1l', '1 l'),
        (r'oil.*?500ml', '500 ml'),
        (r'water.*?1l', '1 l'),
        (r'water.*?500ml', '500 ml'),
        (r'coke.*?750ml', '750 ml'),
        (r'coke.*?1l', '1 l'),
        (r'juice.*?1l', '1 l'),
        (r'biscuit.*?pack', '1 pack'),
        (r'noodles.*?pack', '1 pack'),
        (r'maggi.*?pack', '1 pack'),
        (r'tea.*?250g', '250 g'),
        (r'coffee.*?100g', '100 g'),
        (r'sugar.*?1kg', '1 kg'),
        (r'salt.*?1kg', '1 kg'),
        (r'dal.*?1kg', '1 kg'),
        (r'dal.*?500g', '500 g'),
        (r'atta.*?5kg', '5 kg'),
        (r'atta.*?1kg', '1 kg'),
        (r'flour.*?1kg', '1 kg'),
        (r'butter.*?100g', '100 g'),
        (r'butter.*?500g', '500 g'),
        (r'cheese.*?200g', '200 g'),
        (r'paneer.*?200g', '200 g'),
        (r'paneer.*?500g', '500 g'),
        (r'curd.*?200g', '200 g'),
        (r'curd.*?500g', '500 g'),
        (r'curd.*?1l', '1 l'),
    ]
    
    for pattern, quantity in patterns:
        if re.search(pattern, item_name_lower):
            return quantity
    
    return None

def parse_quantity_to_number(quantity_str: str) -> tuple[float, str]:
    """Parse quantity string to numeric value and unit"""
    quantity_str = quantity_str.lower().strip()
    
    # Common unit conversions to base units
    unit_conversions = {
        'kg': 1.0,
        'g': 0.001,
        'gm': 0.001,
        'l': 1.0,
        'ltr': 1.0,
        'ml': 0.001,
        'pc': 1.0,
        'pcs': 1.0,
        'pack': 1.0,
        'pk': 1.0,
        'nos': 1.0,
        'no': 1.0,
        'unit': 1.0,
        'units': 1.0
    }
    
    # Extract number and unit
    import re
    match = re.match(r'(\d+(?:\.\d+)?)\s*([a-zA-Z]+)', quantity_str)
    if match:
        number = float(match.group(1))
        unit = match.group(2)
        
        # Convert to base unit
        base_unit = unit
        multiplier = 1.0
        
        for key, conversion in unit_conversions.items():
            if unit.startswith(key):
                base_unit = key
                multiplier = conversion
                break
        
        return number * multiplier, base_unit
    
    # Default case - just a number
    try:
        return float(quantity_str), 'unit'
    except ValueError:
        return 1.0, 'unit'

def get_mock_prices(item_name: str, original_price: float, quantity: str = "1") -> List[PlatformPrice]:
    """Generate price comparison data with quantity-aware pricing"""
    
    # Parse quantity for more accurate pricing
    quantity_value, quantity_unit = parse_quantity_to_number(quantity)
    
    # Calculate unit price from original price
    if quantity_value > 0:
        unit_price = original_price / quantity_value
    else:
        unit_price = original_price
    
    # Clean up item name for URL
    clean_name = item_name.strip()
    
    # Generate quantity-aware search query for better results
    search_query = generate_search_query(clean_name, quantity, quantity_unit)
    
    # URL encode the search query for all platforms
    encoded_query = quote_plus(search_query)
    
    # Get affiliate IDs from environment
    amazon_tag = os.environ.get('AMAZON_AFFILIATE_TAG', '')
    flipkart_id = os.environ.get('FLIPKART_AFFILIATE_ID', '')
    meesho_id = os.environ.get('MEESHO_AFFILIATE_ID', '')
    
    # Platform-specific URL generation with proper formats
    platforms_config = {
        'Amazon': {
            'url': f'https://www.amazon.in/s?k={encoded_query}' + (f'&tag={amazon_tag}' if amazon_tag else ''),
            'delivery': 'Next Day'
        },
        'Flipkart': {
            'url': f'https://www.flipkart.com/search?q={encoded_query}' + (f'&affid={flipkart_id}' if flipkart_id else ''),
            'delivery': '2-3 Days'
        },
        'Meesho': {
            'url': f'https://www.meesho.com/search?q={encoded_query}' + (f'&aff_id={meesho_id}' if meesho_id else ''),
            'delivery': '3-5 Days'
        },
        'BigBasket': {
            'url': f'https://www.bigbasket.com/ps/?q={encoded_query}',
            'delivery': 'Same Day'
        },
        'JioMart': {
            'url': f'https://www.jiomart.com/search/{encoded_query}',
            'delivery': 'Next Day'
        },
        'Blinkit': {
            'url': f'https://blinkit.com/search?q={encoded_query}',
            'delivery': '10-15 min'
        },
        'Zepto': {
            'url': f'https://www.zepto.com/search?query={encoded_query}',
            'delivery': '10 min'
        },
        'Swiggy Instamart': {
            'url': f'https://www.swiggy.com/instamart/search?query={encoded_query}',
            'delivery': '15-20 min'
        },
        'Dunzo': {
            'url': f'https://www.dunzo.com/search/{encoded_query}',
            'delivery': '20-30 min'
        }
    }
    
    prices = []
    
    for platform, config in platforms_config.items():
        # Generate price variation based on platform type and quantity
        # Quick commerce platforms tend to be slightly more expensive
        if platform in ['Blinkit', 'Zepto', 'Swiggy Instamart', 'Dunzo']:
            variation = random.uniform(0.95, 1.15)  # Slightly higher for quick delivery
        else:
            variation = random.uniform(0.85, 1.05)
        
        # Calculate platform price based on unit price and quantity
        platform_unit_price = unit_price * variation
        platform_price = round(platform_unit_price * quantity_value, 2)
        savings = round(original_price - platform_price, 2)
        
        # Adjust pricing based on quantity unit for better accuracy
        if quantity_unit in ['kg', 'l']:
            # For bulk items, apply bulk discount on larger platforms
            if platform in ['Amazon', 'Flipkart', 'BigBasket', 'JioMart']:
                bulk_discount = random.uniform(0.02, 0.08)  # 2-8% bulk discount
                platform_price = round(platform_price * (1 - bulk_discount), 2)
                savings = round(original_price - platform_price, 2)
        elif quantity_unit in ['g', 'ml']:
            # For small units, quick commerce might be competitive
            if platform in ['Blinkit', 'Zepto', 'Swiggy Instamart']:
                quick_commerce_boost = random.uniform(-0.03, 0.02)  # -3% to +2%
                platform_price = round(platform_price * (1 + quick_commerce_boost), 2)
                savings = round(original_price - platform_price, 2)
        
        prices.append(PlatformPrice(
            platform=platform,
            price=platform_price,
            url=config['url'],
            savings=savings
        ))
    
    # Sort by price (cheapest first)
    return sorted(prices, key=lambda x: x.price)

# ============ ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = User(
        name=user_data.name,
        email=user_data.email
    ).model_dump()
    
    user_dict['password_hash'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token({"user_id": user_dict['id']})
    
    # Remove password hash from response
    del user_dict['password_hash']
    user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    
    return TokenResponse(
        token=token,
        user=User(**user_dict)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_access_token({"user_id": user['id']})
    
    # Remove password hash
    del user['password_hash']
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return TokenResponse(
        token=token,
        user=User(**user)
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

# ============ OAUTH ROUTES ============

@api_router.get("/auth/oauth/google")
async def google_login(request: Request):
    """Initiate Google OAuth flow"""
    redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@api_router.get("/auth/oauth/google/callback")
async def google_callback(request: Request):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        # Process user and create/update in database
        jwt_token, user = await process_oauth_user('google', user_info)
        
        # Redirect to frontend with token
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(
            url=f"{frontend_url}/oauth-callback?token={jwt_token}&user={user.model_dump_json()}"
        )
    
    except OAuthError as e:
        logger.error(f"Google OAuth error: {e}")
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

@api_router.get("/auth/oauth/github")
async def github_login(request: Request):
    """Initiate GitHub OAuth flow"""
    redirect_uri = os.environ.get('GITHUB_REDIRECT_URI')
    return await oauth.github.authorize_redirect(request, redirect_uri)

@api_router.get("/auth/oauth/github/callback")
async def github_callback(request: Request):
    """Handle GitHub OAuth callback"""
    try:
        token = await oauth.github.authorize_access_token(request)
        
        # Get user info from GitHub API
        resp = await oauth.github.get('user', token=token)
        user_info = resp.json()
        
        # GitHub doesn't always return email in user endpoint, need to fetch separately
        if not user_info.get('email'):
            email_resp = await oauth.github.get('user/emails', token=token)
            emails = email_resp.json()
            # Get primary email
            primary_email = next((e['email'] for e in emails if e['primary']), None)
            if primary_email:
                user_info['email'] = primary_email
        
        if not user_info.get('email'):
            raise HTTPException(status_code=400, detail="No email found in GitHub account")
        
        # Process user and create/update in database
        jwt_token, user = await process_oauth_user('github', user_info)
        
        # Redirect to frontend with token
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(
            url=f"{frontend_url}/oauth-callback?token={jwt_token}&user={user.model_dump_json()}"
        )
    
    except OAuthError as e:
        logger.error(f"GitHub OAuth error: {e}")
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")


@api_router.post("/bills/upload", response_model=BillAnalysis)
async def upload_bill(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert PIL image to numpy array for EasyOCR
        import numpy as np
        import cv2
        import re

        # --- Enhanced Image Preprocessing ---
        # Convert PIL to BGR (OpenCV format)
        open_cv_image = np.array(image) 
        # Convert RGB to BGR 
        open_cv_image = open_cv_image[:, :, ::-1].copy() 

        # Multiple preprocessing approaches for better OCR
        processed_images = []
        
        # 1. Basic grayscale
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
        
        # 2. Auto-rotate image if needed (detect orientation)
        # This helps with bills that are scanned at an angle
        coords = np.column_stack(np.where(gray > 0))
        if len(coords) > 0:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            # Only rotate if angle is significant
            if abs(angle) > 0.5:
                (h, w) = gray.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                gray = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        
        # 3. Denoised version - improved parameters
        denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
        
        # 4. Contrast enhancement with CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # 5. Adaptive threshold for better text separation
        adaptive_thresh = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # 6. Otsu thresholding for global binarization
        _, otsu_thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # 7. Morphological operations to clean up text
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        morphed = cv2.morphologyEx(adaptive_thresh, cv2.MORPH_CLOSE, kernel)
        
        # 8. Sharpening for better edge detection
        kernel_sharp = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel_sharp)
        
        # Try OCR on multiple processed versions and combine results
        all_results = []
        processed_images = [gray, denoised, enhanced, adaptive_thresh, otsu_thresh, morphed, sharpened]
        
        for i, processed_img in enumerate(processed_images):
            try:
                # Use paragraph=False for better line-by-line extraction
                result = reader.readtext(processed_img, detail=1, paragraph=False)
                all_results.extend(result)
                logger.info(f"OCR attempt {i+1}: Found {len(result)} text regions")
            except Exception as e:
                logger.warning(f"OCR attempt {i+1} failed: {e}")
                continue
        
        # Enhanced duplicate removal using spatial clustering
        # Group texts that are very close to each other and have similar content
        unique_results = []
        seen_positions = []
        
        for bbox, text, prob in all_results:
            text_clean = text.strip().lower()
            
            # Skip very low confidence or empty text
            if not text_clean or prob < 0.25:
                continue
            
            # Get center position of bounding box
            center_y = (bbox[0][1] + bbox[2][1]) / 2
            center_x = (bbox[0][0] + bbox[2][0]) / 2
            
            # Check if this text is a duplicate (similar position and text)
            is_duplicate = False
            for prev_bbox, prev_text, prev_prob in unique_results:
                prev_center_y = (prev_bbox[0][1] + prev_bbox[2][1]) / 2
                prev_center_x = (prev_bbox[0][0] + prev_bbox[2][0]) / 2
                
                # If positions are very close (within 20 pixels) and text is similar
                if (abs(center_y - prev_center_y) < 20 and 
                    abs(center_x - prev_center_x) < 20 and
                    (text_clean == prev_text.strip().lower() or 
                     text_clean in prev_text.strip().lower() or 
                     prev_text.strip().lower() in text_clean)):
                    is_duplicate = True
                    # Keep the one with higher confidence
                    if prob > prev_prob:
                        unique_results.remove((prev_bbox, prev_text, prev_prob))
                        unique_results.append((bbox, text, prob))
                    break
            
            if not is_duplicate:
                unique_results.append((bbox, text, prob))
        
        logger.info(f"Total unique text regions found: {len(unique_results)}")
        
        # Extract text and sort by vertical position (top to bottom)
        extracted_text = " ".join([text for (bbox, text, prob) in unique_results])
        logger.info(f"Extracted text: {extracted_text[:500]}..." if len(extracted_text) > 500 else extracted_text)
        
        # Sort results by vertical position for better line ordering
        sorted_results = sorted(unique_results, key=lambda x: (x[0][0][1], x[0][0][0]))  # Sort by y, then x
        
        # Parse items using enhanced logic
        raw_items = []
        lines = [text.strip() for (bbox, text, prob) in sorted_results if text.strip() and len(text.strip()) > 1]
        
        # Enhanced Parsing Logic
        # Better regex patterns for Indian receipts
        price_pattern = re.compile(r'(?:Rs\.?|₹|INR)?\s*(\d{1,5}(?:[.,]\d{2})?)', re.IGNORECASE)
        
        # Enhanced quantity patterns - more comprehensive
        qty_pattern = re.compile(r'(\d+(?:\.\d+)?\s*(?:kg|g|gm|gram|grams|l|ltr|liter|liters|ml|milliliter|pc|pcs|piece|pieces|pack|pk|nos|no|unit|units|doz|dozen|box|bottle|btl|can|tin|packet|pkt))', re.IGNORECASE)
        
        # Common receipt terms to filter out - Expanded list
        skip_terms = [
            # Financial terms
            'total', 'subtotal', 'gst', 'tax', 'vat', 'cgst', 'sgst', 'igst', 'cess', 'service', 'charge',
            'cash', 'card', 'credit', 'debit', 'change', 'balance', 'due', 'paid', 'amount', 'rupees',
            'rs', '₹', 'inr', 'price', 'rate', 'cost', 'mrp', 'discount', 'offer', 'saving',
            
            # Receipt metadata
            'bill', 'invoice', 'receipt', 'thank', 'visit', 'again', 'welcome', 'customer', 'copy',
            'original', 'duplicate', 'void', 'cancelled', 'returned', 'refund', 'exchange',
            
            # Store information
            'phone', 'mobile', 'address', 'email', 'website', 'www', 'http', 'com', 'in', 'net',
            'store', 'shop', 'mall', 'market', 'branch', 'outlet', 'franchise', 'retail',
            
            # Date and time
            'date', 'time', 'day', 'month', 'year', 'hour', 'min', 'sec', 'am', 'pm',
            'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
            
            # Table headers
            's.no', 'sr.no', 'item', 'qty', 'quantity', 'rate', 'amount', 'price', 'total',
            'code', 'barcode', 'hsn', 'sac', 'description', 'details', 'particulars',
            
            # Payment methods
            'upi', 'paytm', 'gpay', 'phonepe', 'googlepay', 'bhim', 'netbanking', 'wallet',
            'visa', 'mastercard', 'rupay', 'maestro', 'atm', 'pos', 'swipe', 'pin',
            
            # Staff and service
            'staff', 'waiter', 'server', 'cashier', 'manager', 'supervisor', 'executive',
            'service', 'tip', 'gratuity', 'delivery', 'packing', 'carry', 'takeaway',
            
            # Technical terms
            'kg', 'gm', 'g', 'l', 'ltr', 'ml', 'pc', 'pcs', 'nos', 'no', 'unit', 'units',
            'pack', 'pk', 'dozen', 'dz', 'piece', 'pieces', 'set', 'pair', 'pairs',
            
            # Common Indian store terms
            'limited', 'pvt', 'ltd', 'private', 'corporation', 'enterprise', 'traders',
            'distributors', 'wholesale', 'retail', 'supermarket', 'hypermarket', 'kirana',
            'provisions', 'general', 'stores', 'bazaar', 'mandi', 'society', 'cooperative',
            
            # Quality and expiry
            'best', 'before', 'expiry', 'exp', 'mfg', 'manufactured', 'batch', 'lot',
            'fresh', 'organic', 'natural', 'pure', 'quality', 'premium', 'standard',
            
            # Promotional
            'free', 'gift', 'bonus', 'combo', 'pack', 'deal', 'offer', 'sale', 'discount',
            'promotion', 'special', 'limited', 'period', 'hurry', 'only', 'while', 'stocks',
            
            # Location based
            'no', 'number', 'flat', 'apartment', 'building', 'tower', 'block', 'sector',
            'phase', 'area', 'colony', 'society', 'road', 'street', 'lane', 'cross',
            
            # Miscellaneous
            'e', '&', 'and', 'or', 'the', 'of', 'in', 'at', 'on', 'for', 'to', 'from',
            'with', 'by', 'as', 'per', 'each', 'all', 'any', 'some', 'more', 'less'
        ]
        
        # Items that are likely actual products - Expanded Indian grocery list
        product_keywords = [
            # Dairy Products
            'milk', 'bread', 'egg', 'butter', 'cheese', 'curd', 'yogurt', 'paneer', 'ghee', 'cream',
            'lassi', 'buttermilk', 'khoya', 'dahi',
            
            # Grains & Flours
            'rice', 'atta', 'flour', 'dal', 'lentil', 'semolina', 'rava', 'sooji', 'oats', 'dalia',
            'poha', 'vermicelli', 'noodles', 'pasta', 'cornflakes', 'muesli',
            
            # Oils & Fats
            'oil', 'ghee', 'vanaspati', 'mustard', 'refined', 'sunflower', 'groundnut', 'coconut',
            
            # Spices & Masalas
            'spice', 'masala', 'turmeric', 'haldi', 'chilli', 'mirch', 'cumin', 'jeera', 'coriander',
            'dhania', 'cardamom', 'elaichi', 'clove', 'laung', 'cinnamon', 'dalchini', 'pepper',
            'mirchi', 'asafoetida', 'hing', 'fenugreek', 'methi', 'mustard', 'rai', 'salt', 'namak',
            
            # Vegetables
            'vegetable', 'potato', 'aloo', 'onion', 'pyaz', 'tomato', 'tamatar', 'carrot', 'gajar',
            'beans', 'cabbage', 'cauliflower', 'gobhi', 'spinach', 'palak', 'ladyfinger', 'bhindi',
            'bottle', 'gourd', 'lauki', 'bitter', 'gourd', 'karela', 'pumpkin', 'kaddu',
            'brinjal', 'baingan', 'capsicum', 'shimla', 'mirch', 'cucumber', 'kheera', 'radish',
            'mooli', 'beetroot', 'chukandar', 'peas', 'matar', 'corn', 'bhutta', 'mushroom',
            'kumbh', 'broccoli', 'lettuce', 'celery', 'leeks', 'ginger', 'adrak', 'garlic', 'lahsun',
            
            # Fruits
            'fruit', 'apple', 'banana', 'orange', 'mosambi', 'grape', 'mango', 'papaya', 'pineapple',
            'watermelon', 'tarbooz', 'muskmelon', 'kharbooja', 'pomegranate', 'anar', 'guava',
            'amrood', 'chikoo', 'sapota', 'pear', 'peach', 'plum', 'cherry', 'kiwi', 'fig', 'anjeer',
            'coconut', 'nariyal', 'lemon', 'lime', 'nimbu',
            
            # Meat & Seafood
            'chicken', 'mutton', 'meat', 'fish', 'egg', 'prawn', 'shrimp', 'crab', 'sausage',
            'ham', 'bacon', 'turkey', 'duck',
            
            # Beverages
            'juice', 'water', 'coke', 'pepsi', 'thumsup', 'sprite', 'fanta', 'mirinda', '7up',
            'tea', 'coffee', 'nescafe', 'bru', 'tata', 'red', 'label', 'green', 'tea', 'horlicks',
            'boost', 'bournvita', 'complan', 'milo', 'boost', 'energy', 'drink', 'gatorade',
            'lassi', 'buttermilk', 'chaas', 'coconut', 'water', 'neera', 'sugarcane', 'juice',
            
            # Snacks & Biscuits
            'biscuit', 'cookie', 'cracker', 'khari', 'monaco', 'marie', 'good', 'day', 'britannia',
            'parle', 'oreo', 'hide', 'seek', 'dark', 'fantasy', 'chips', 'lays', 'kurkure',
            'bingo', 'popcorn', 'nachos', 'pretzels', 'nuts', 'almond', 'badam', 'cashew', 'kaju',
            'pistachio', 'pista', 'walnut', 'akhrot', 'raisin', 'kishmish', 'dates', 'khajoor',
            
            # Personal Care & Cosmetics
            'soap', 'shampoo', 'toothpaste', 'toothbrush', 'detergent', 'washing', 'powder',
            'conditioner', 'hair', 'oil', 'cream', 'lotion', 'face', 'wash', 'perfume', 'deodorant',
            'talcum', 'powder', 'vaseline', 'nivea', 'dove', 'ponds', 'fair', 'lovely', 'gillette',
            'pampers', 'huggies', 'johnson', 'baby', 'powder', 'oil', 'soap', 'diaper', 'napkin',
            
            # Household & Cleaning
            'tissue', 'paper', 'napkin', 'toilet', 'roll', 'hand', 'sanitizer', 'phenyl', 'harpic',
            'lizol', 'dettol', 'savlon', 'bleaching', 'powder', 'vinegar', 'baking', 'soda',
            'camphor', 'kapoor', 'agarbatti', 'incense', 'matchbox', 'candle', 'battery', 'bulb',
            'torch', 'plastic', 'wrap', 'foil', 'aluminium', 'container', 'bottle', 'jar',
            
            # Ready to Eat & Packaged Foods
            'maggi', 'noodles', 'pasta', 'soup', 'ketchup', 'sauce', 'chili', 'sauce', 'soya',
            'vinegar', 'pickles', 'achaar', 'jam', 'honey', 'butter', 'peanut', 'cheese', 'spread',
            'mayonnaise', 'mustard', 'sauce', 'worsteshire', 'sauce', 'chutney', 'sambhar',
            'rasam', 'mix', 'upma', 'mix', 'idli', 'mix', 'dosa', 'mix', 'pancake', 'mix',
            
            # Sweets & Desserts
            'chocolate', 'cadbury', 'dairy', 'milk', 'kitkat', 'milkybar', 'perk', 'eclairs',
            'gems', 'toffees', 'candy', 'gums', 'icecream', 'kulfi', 'rasgulla', 'gulabjamun',
            'peda', 'barfi', 'laddu', 'jalebi', 'soan', 'papdi', 'halwa', 'kheer', 'payasam',
            
            # Health & Medicine
            'medicine', 'tablet', 'capsule', 'syrup', 'ointment', 'bandage', 'cotton', 'bpl',
            'dettol', 'betadine', 'volini', 'moov', 'iodex', 'crocin', 'paracetamol', 'aspirin',
            'disprin', 'combiflam', 'vicks', 'action', '500', 'strepsils', 'halls', 'vicks',
            'inhaler', 'nasal', 'drops', 'eye', 'drops', 'ear', 'drops',
            
            # Miscellaneous
            'newspaper', 'magazine', 'notebook', 'pen', 'pencil', 'eraser', 'sharpener', 'scale',
            'mobile', 'recharge', 'sim', 'card', 'prepaid', 'postpaid', 'internet', 'data',
            'cable', 'tv', 'dth', 'set', 'top', 'box', 'remote', 'battery', 'cell', 'aaa', 'aa'
        ]

        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # Skip lines that are too short or contain receipt metadata
            if len(line) < 3 or any(term in line_lower for term in skip_terms):
                continue
            
            # Skip lines that are just numbers or codes
            if re.match(r'^[\d\s\-\.,]+$', line):
                continue

            # Find all potential prices in the line
            price_matches = list(price_pattern.finditer(line))
            
            if not price_matches:
                # Try to find standalone price lines (common in receipts)
                if re.match(r'^\s*(?:Rs\.?|₹)?\s*\d+(?:[.,]\d{2})?\s*$', line):
                    # This is likely a price, try to get item from previous line
                    if i > 0:
                        prev_line = lines[i-1].strip()
                        if len(prev_line) > 3 and not any(term in prev_line.lower() for term in skip_terms):
                            try:
                                price = float(re.findall(r'\d+(?:[.,]\d{2})?', line)[0].replace(',', ''))
                                if 5 <= price <= 20000:
                                    raw_items.append({
                                        "name": prev_line,
                                        "price": price,
                                        "quantity": "1"
                                    })
                                    continue
                            except (ValueError, IndexError):
                                continue
                continue
                
            # Use the last price match as the item price
            last_match = price_matches[-1]
            price_str = last_match.group(1).replace(',', '')
            
            try:
                price = float(price_str)
            except ValueError:
                continue
                
            # Filter unrealistic prices
            if price < 5 or price > 20000:
                continue

            # Extract item name (everything before the price)
            item_part = line[:last_match.start()].strip()
            
            # Clean up the item name
            # Remove leading numbers/bullet points
            item_part = re.sub(r'^[\d\-\.)]+\s*', '', item_part)
            # Remove extra spaces
            item_part = re.sub(r'\s+', ' ', item_part)
            # Remove common price symbols
            item_part = re.sub(r'[Rs₹INR]+', '', item_part, flags=re.IGNORECASE)
            
            # Validate item name
            if len(item_part) < 2 or not re.search(r'[a-zA-Z]', item_part):
                # Try to get item name from previous line
                if i > 0:
                    prev_line = lines[i-1].strip()
                    if (len(prev_line) > 3 and 
                        not any(term in prev_line.lower() for term in skip_terms) and
                        not re.search(r'\d', prev_line)):
                        item_part = prev_line
                    else:
                        continue
                else:
                    continue

            # Extract quantity with enhanced logic
            qty = "1"
            qty_match = qty_pattern.search(item_part)
            if qty_match:
                qty_raw = qty_match.group(1)
                # Normalize quantity units
                qty_normalized = normalize_quantity(qty_raw)
                qty = qty_normalized
                # Remove quantity from item name for cleaner display
                item_part = item_part.replace(qty_match.group(0), '').strip()
            else:
                # Try to infer quantity from item name patterns
                qty_inferred = infer_quantity_from_name(item_part)
                if qty_inferred:
                    qty = qty_inferred
            
            # Final cleanup of item name
            item_part = item_part.strip()
            if len(item_part) < 2:
                continue
            
            raw_items.append({
                "name": item_part,
                "price": price,
                "quantity": qty
            })
        
        # Enhanced fallback with better item suggestions
        if not raw_items:
            logger.warning("No items extracted from OCR, using enhanced fallback")
            
            # Try to extract any numbers from the text as potential prices
            all_numbers = re.findall(r'\b\d{2,5}(?:[.,]\d{2})?\b', extracted_text)
            valid_prices = []
            
            for num_str in all_numbers:
                try:
                    num = float(num_str.replace(',', ''))
                    if 5 <= num <= 20000:
                        valid_prices.append(num)
                except ValueError:
                    continue
            
            # If we found some prices, create generic items
            if valid_prices:
                # Use the most reasonable prices (not the extremes)
                valid_prices.sort()
                selected_prices = valid_prices[:min(10, len(valid_prices))]  # Take first 10 reasonable prices
                
                for i, price in enumerate(selected_prices):
                    raw_items.append({
                        "name": f"Item {i+1}",
                        "price": price,
                        "quantity": "1"
                    })
            else:
                # Ultimate fallback with realistic Indian grocery prices
                raw_items = [
                    {"name": "Milk", "price": 60.0, "quantity": "1L"},
                    {"name": "Bread", "price": 40.0, "quantity": "1"},
                    {"name": "Eggs", "price": 80.0, "quantity": "12"},
                    {"name": "Rice", "price": 120.0, "quantity": "1kg"},
                    {"name": "Oil", "price": 150.0, "quantity": "1L"}
                ]
        
        # Log extraction results
        logger.info(f"Extracted {len(raw_items)} items from bill")
        for i, item in enumerate(raw_items[:5]):  # Log first 5 items
            logger.info(f"Item {i+1}: {item['name']} - ₹{item['price']} ({item['quantity']})")
        
        if len(raw_items) > 5:
            logger.info(f"... and {len(raw_items) - 5} more items")
        
        # Categorize with LLM
        categorized_items = await categorize_items_with_llm(raw_items)
        
        # Calculate total
        total_amount = sum(item.price or 0 for item in categorized_items)
        
        # Platform configuration for recommendations (matches get_mock_prices)
        platforms_config_for_recs = {
            'Amazon': {'delivery': 'Next Day'},
            'Flipkart': {'delivery': '2-3 Days'},
            'Meesho': {'delivery': '3-5 Days'},
            'BigBasket': {'delivery': 'Same Day'},
            'JioMart': {'delivery': 'Next Day'},
            'Blinkit': {'delivery': '10-15 min'},
            'Zepto': {'delivery': '10 min'},
            'Swiggy Instamart': {'delivery': '15-20 min'},
            'Dunzo': {'delivery': '20-30 min'}
        }
        
        # Get price comparisons with smart recommendations
        items_with_prices = []
        for item in categorized_items:
            if item.price:
                platform_prices = get_mock_prices(item.name, item.price, item.quantity or "1")
                best_price = min(p.price for p in platform_prices)
                max_savings = item.price - best_price
                
                # Generate smart recommendations
                recommendations = get_smart_recommendations(
                    item.category or "Other",
                    platform_prices,
                    platforms_config_for_recs
                )
                
                items_with_prices.append(ItemWithPrices(
                    name=item.name,
                    category=item.category or "Other",
                    original_price=item.price,
                    platform_prices=platform_prices,
                    best_price=best_price,
                    max_savings=max_savings,
                    recommended_platforms=recommendations
                ))
        
        # Create bill
        bill = Bill(
            user_id=user_id,
            total_amount=total_amount,
            items=categorized_items
        )
        
        # Save to database
        bill_dict = bill.model_dump()
        bill_dict['upload_date'] = bill_dict['upload_date'].isoformat()
        await db.bills.insert_one(bill_dict)
        
        # Calculate total savings
        total_savings = sum(item.max_savings for item in items_with_prices)
        
        return BillAnalysis(
            bill=bill,
            items_with_prices=items_with_prices,
            total_savings_potential=total_savings
        )
        
    except Exception as e:
        logger.error(f"Bill upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process bill: {str(e)}")

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(user_id: str = Depends(get_current_user)):
    bills = await db.bills.find({"user_id": user_id}, {"_id": 0}).sort("upload_date", -1).to_list(100)
    
    for bill in bills:
        if isinstance(bill['upload_date'], str):
            bill['upload_date'] = datetime.fromisoformat(bill['upload_date'])
    
    return [Bill(**bill) for bill in bills]

@api_router.get("/insights", response_model=SpendingInsights)
async def get_insights(user_id: str = Depends(get_current_user)):
    bills = await db.bills.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    if not bills:
        return SpendingInsights(
            total_spending=0,
            category_breakdown={},
            monthly_trend=[],
            top_categories=[]
        )
    
    # Calculate totals
    total_spending = sum(bill['total_amount'] for bill in bills)
    
    # Category breakdown
    category_breakdown = {}
    for bill in bills:
        for item in bill.get('items', []):
            category = item.get('category', 'Other')
            price = item.get('price', 0)
            category_breakdown[category] = category_breakdown.get(category, 0) + price
    
    # Monthly trend (last 6 months)
    monthly_trend = []
    for i in range(6):
        month_date = datetime.now(timezone.utc) - timedelta(days=30*i)
        month_name = month_date.strftime("%b %Y")
        # Mock data for demo
        monthly_trend.insert(0, {
            "month": month_name,
            "spending": round(total_spending / 6 + random.uniform(-500, 500), 2)
        })
    
    # Top categories
    top_categories = [
        {"category": cat, "amount": amt, "percentage": round((amt/total_spending)*100, 1)}
        for cat, amt in sorted(category_breakdown.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    
    return SpendingInsights(
        total_spending=total_spending,
        category_breakdown=category_breakdown,
        monthly_trend=monthly_trend,
        top_categories=top_categories
    )

@api_router.post("/shopping-list/generate", response_model=ShoppingList)
async def generate_shopping_list(
    budget: float,
    user_id: str = Depends(get_current_user)
):
    try:
        # Get user's purchase history
        bills = await db.bills.find({"user_id": user_id}, {"_id": 0}).sort("upload_date", -1).limit(5).to_list(5)
        
        # Collect frequently bought items
        item_frequency = {}
        for bill in bills:
            for item in bill.get('items', []):
                name = item.get('name')
                if name:
                    item_frequency[name] = item_frequency.get(name, 0) + 1
        
        # Use LLM to generate shopping list
        system_message = "You are a smart shopping assistant that helps create budget-friendly shopping lists."
        
        history_context = json.dumps(list(item_frequency.keys())[:10]) if item_frequency else "[]"
        
        prompt = f"""
Create a monthly shopping list for a budget of ₹{budget}.

User's frequently purchased items: {history_context}

Generate a practical shopping list with essential items. Return ONLY a JSON array:
[
  {{"name": "item name", "category": "category", "estimated_price": price, "quantity": "qty"}}
]

Categories: Dairy, Snacks, Beverages, Cleaning, Personal Care, Groceries, Fruits & Vegetables, Meat & Seafood, Bakery, Frozen Foods.
Keep total under budget. No explanation, just JSON.
"""
        
        response = await call_gemini(prompt, system_message)
        
        # Parse response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        items_data = json.loads(response_text)
        items = [ShoppingListItem(**item) for item in items_data]
        
        total_estimated = sum(item.estimated_price for item in items)
        
        # Create shopping list
        shopping_list = ShoppingList(
            user_id=user_id,
            budget=budget,
            items=items,
            total_estimated=total_estimated
        )
        
        # Save to database
        list_dict = shopping_list.model_dump()
        list_dict['created_at'] = list_dict['created_at'].isoformat()
        await db.shopping_lists.insert_one(list_dict)
        
        return shopping_list
        
    except Exception as e:
        logger.error(f"Shopping list generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate list: {str(e)}")

@api_router.get("/shopping-lists", response_model=List[ShoppingList])
async def get_shopping_lists(user_id: str = Depends(get_current_user)):
    lists = await db.shopping_lists.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    for lst in lists:
        if isinstance(lst['created_at'], str):
            lst['created_at'] = datetime.fromisoformat(lst['created_at'])
    
    return [ShoppingList(**lst) for lst in lists]

# Include the router in the main app
app.include_router(api_router)

# Add SessionMiddleware for OAuth
app.add_middleware(SessionMiddleware, secret_key=JWT_SECRET)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
