import os
import logging
import traceback

def fetch_prices():
    try:
        # existing code to fetch prices
        # Add a check for the environment variable
        if 'DB_CONNECTION_STRING' not in os.environ:
            logging.error("DB_CONNECTION_STRING environment variable is missing")
            return None
        db_connection_string = os.environ['DB_CONNECTION_STRING']
        # existing code to connect to database and fetch prices
    except Exception as e:
        # Log the exception and return a meaningful error message
        logging.error(f"An error occurred: {e}")
        logging.error(traceback.format_exc())
        return None
    try:
        # Add a defensive check to ensure the database connection is successful
        db_connection_string = os.environ.get('DB_CONNECTION_STRING')
        except Exception as e:
            # Add a defensive check to log and handle the exception
            logging.error(f"An error occurred: {str(e)}")
            # Add a defensive check to ensure the database connection is closed
            if 'db' in locals() and db:
                db.close()
            return []

def get_products():
    try:
        prices = fetch_prices()
        # Rest of the method remains the same
logger = logging.getLogger(__name__)
        except Exception as e:
            # Add a defensive check to log and handle the exception
            logging.error(f"An error occurred: {str(e)}")
            # Add a defensive check to ensure the database connection is closed
            if 'db' in locals() and db:
                db.close()
            return []
class PriceFetcher:
    """
    Fetch prices from e-commerce platforms.
    
    Features:
    - In-memory caching with TTL
    - Async parallel fetching
    - Graceful fallback to mock data
    - Ready for API integration
    """
    
    def __init__(self, cache_ttl: int = 3600):
        """
        Initialize price fetcher.
        
        Args:
            cache_ttl: Cache time-to-live in seconds (default: 1 hour)
        """
        self.cache: Dict[str, tuple] = {}
        self.cache_ttl = cache_ttl
        logger.info(f"PriceFetcher initialized with {cache_ttl}s cache TTL")
    
    async def get_prices(
        self, 
        product_name: str, 
        quantity: str = "1",
        category: str = "Other"
    ) -> List[Dict[str, Any]]:
        """
        Get prices from all platforms.
        
        Args:
            product_name: Name of the product
            quantity: Product quantity (e.g., "1L", "500g")
            category: Product category for smart fetching
        
        Returns:
            List of price dictionaries with platform, price, url, etc.
        """
        
        # Check cache first
        cache_key = self._get_cache_key(product_name, quantity)
        cached = self._get_from_cache(cache_key)
        
        if cached:
            logger.info(f"Cache hit for {product_name}")
            return cached
        
        logger.info(f"Cache miss for {product_name}, fetching prices...")
        
        # Fetch from platforms in parallel
        prices = await self._fetch_all_platforms(product_name, quantity, category)
        
        # Cache results
        self._save_to_cache(cache_key, prices)
        
        return prices
    
    async def _fetch_all_platforms(
        self, 
        product: str, 
        quantity: str,
        category: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch prices from all platforms in parallel.
        
        Currently returns mock data. Ready for API integration.
        """
        
        # Create tasks for parallel fetching
        tasks = [
            self._fetch_amazon(product, quantity),
            self._fetch_flipkart(product, quantity),
            self._fetch_meesho(product, quantity),
            self._fetch_bigbasket(product, quantity),
            self._fetch_jiomart(product, quantity),
            self._fetch_blinkit(product, quantity),
            self._fetch_zepto(product, quantity),
            self._fetch_swiggy_instamart(product, quantity),
            self._fetch_dunzo(product, quantity),
        ]
        
        # Execute in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors and None values
        prices = []
        for result in results:
            if result and not isinstance(result, Exception):
                prices.append(result)
            elif isinstance(result, Exception):
                logger.error(f"Platform fetch error: {result}")
        
        return prices
    
    # Platform-specific fetch methods using web scraping
    
    async def _scrape_price(self, url: str, price_selectors: List[str]) -> Optional[float]:
        """
        Generic scraper to extract price from a webpage.
        
        Args:
            url: URL to scrape
            price_selectors: List of CSS selectors to try for price extraction
        
        Returns:
            Extracted price or None
        """
        try:
            headers = {
                'User-Agent': ua.random,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
            }
            
            timeout = aiohttp.ClientTimeout(total=5)  # 5 second timeout
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, headers=headers) as response:
                    if response.status != 200:
                        return None
                    
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')  # Use built-in parser
                    
                    # Try each selector
                    for selector in price_selectors:
                        elements = soup.select(selector)
                        for element in elements:
                            text = element.get_text(strip=True)
                            # Extract price using regex
                            price_match = re.search(r'[\d,]+\.?\d*', text.replace(',', ''))
                            if price_match:
                                price_str = price_match.group()
                                try:
                                    return float(price_str)
                                except ValueError:
                                    continue
            
            return None
            
        except Exception as e:
            logger.debug(f"Scraping error for {url}: {e}")
            return None
    
    async def _fetch_amazon(self, product: str, qty: str) -> Optional[Dict]:
        """Fetch from Amazon India using web scraping"""
        try:
            search_query = f"{product} {qty}".replace(' ', '+')
            url = f"https://www.amazon.in/s?k={search_query}"
            
            price_selectors = [
                '.a-price-whole',
                '.a-price .a-offscreen',
                'span.a-price-whole'
            ]
            
            price = await self._scrape_price(url, price_selectors)
            
            if price:
                return {
                    'platform': 'Amazon',
                    'price': price,
                    'url': url,
                    'scraped': True
                }
            
        except Exception as e:
            logger.debug(f"Amazon scrape error: {e}")
        
        return None
    
    async def _fetch_flipkart(self, product: str, qty: str) -> Optional[Dict]:
        """Fetch from Flipkart using web scraping"""
        try:
            search_query = f"{product} {qty}".replace(' ', '+')
            url = f"https://www.flipkart.com/search?q={search_query}"
            
            price_selectors = [
                '._30jeq3',
                '._1_WHN1',
                '.\_25b18c'
            ]
            
            price = await self._scrape_price(url, price_selectors)
            
            if price:
                return {
                    'platform': 'Flipkart',
                    'price': price,
                    'url': url,
                    'scraped': True
                }
            
        except Exception as e:
            logger.debug(f"Flipkart scrape error: {e}")
        
        return None
    
    async def _fetch_meesho(self, product: str, qty: str) -> Optional[Dict]:
        """Fetch from Meesho using web scraping"""
        try:
            search_query = f"{product} {qty}".replace(' ', '+')
            url = f"https://www.meesho.com/search?q={search_query}"
            
            price_selectors = [
                '.ProductCard__Price',
                '[data-testid="product-price"]',
                '.sc-eDvSVe'
            ]
            
            price = await self._scrape_price(url, price_selectors)
            
            if price:
                return {
                    'platform': 'Meesho',
                    'price': price,
                    'url': url,
                    'scraped': True
                }
            
        except Exception as e:
            logger.debug(f"Meesho scrape error: {e}")
        
        return None
    
    async def _fetch_bigbasket(self, product: str, qty: str) -> Optional[Dict]:
        """Fetch from BigBasket using web scraping"""
        try:
            search_query = f"{product} {qty}".replace(' ', '+')
            url = f"https://www.bigbasket.com/ps/?q={search_query}"
            
            price_selectors = [
                '.Pricing___StyledLabel',
                '.price',
                '[data-testid="product-price"]'
            ]
            
            price = await self._scrape_price(url, price_selectors)
            
            if price:
                return {
                    'platform': 'BigBasket',
                    'price': price,
                    'url': url,
                    'scraped': True
                }
            
        except Exception as e:
            logger.debug(f"BigBasket scrape error: {e}")
        
        return None
    
    async def _fetch_jiomart(self, product: str, qty: str) -> Optional[Dict]:
        """Fetch from JioMart using web scraping"""
        try:
            search_query = f"{product} {qty}".replace(' ', '+')
            url = f"https://www.jiomart.com/search/{search_query}"
            
            price_selectors = [
                '.jm-heading-xxs',
                '.final-price',
                '[data-testid="price"]'
            ]
            
            price = await self._scrape_price(url, price_selectors)
            
            if price:
                return {
                    'platform': 'JioMart',
                    'price': price,
                    'url': url,
                    'scraped': True
                }
            
        except Exception as e:
            logger.debug(f"JioMart scrape error: {e}")
        
        return None
    
    async def _fetch_blinkit(self, product: str, qty: str) -> Optional[Dict]:
        """Fetch from Blinkit using web scraping"""
        try:
            search_query = f"{product} {qty}".replace(' ', '+')
            url = f"https://blinkit.com/s/?q={search_query}"
            
            price_selectors = [
                '.Product__UpdatedPrice',
                '.price',
                '[data-testid="product-price"]'
            ]
            
            price = await self._scrape_price(url, price_selectors)
            
            if price:
                return {
                    'platform': 'Blinkit',
                    'price': price,
                    'url': url,
                    'scraped': True
                }
            
        except Exception as e:
            logger.debug(f"Blinkit scrape error: {e}")
        
        return None
    
    async def _fetch_zepto(self, product: str, qty: str) -> Optional[Dict]:
        """Fetch from Zepto using web scraping"""
        try:
            search_query = f"{product} {qty}".replace(' ', '+')
            url = f"https://www.zepto.com/search?query={search_query}"
            
            price_selectors = [
                '.price-text',
                '[data-testid="product-price"]',
                '.product-price'
            ]
            
            price = await self._scrape_price(url, price_selectors)
            
            if price:
                return {
                    'platform': 'Zepto',
                    'price': price,
                    'url': url,
                    'scraped': True
                }
            
        except Exception as e:
            logger.debug(f"Zepto scrape error: {e}")
        
        return None
    
    async def _fetch_swiggy_instamart(self, product: str, qty: str) -> Optional[Dict]:
        """Fetch from Swiggy Instamart using web scraping"""
        try:
            search_query = f"{product} {qty}".replace(' ', '+')
            url = f"https://www.swiggy.com/instamart/search?custom_back=true&query={search_query}"
            
            price_selectors = [
                '.ProductCard_price',
                '[data-testid="product-price"]',
                '.price-value'
            ]
            
            price = await self._scrape_price(url, price_selectors)
            
            if price:
                return {
                    'platform': 'Swiggy Instamart',
                    'price': price,
                    'url': url,
                    'scraped': True
                }
            
        except Exception as e:
            logger.debug(f"Swiggy Instamart scrape error: {e}")
        
        return None
    
    async def _fetch_dunzo(self, product: str, qty: str) -> Optional[Dict]:
        """Fetch from Dunzo using web scraping"""
        try:
            search_query = f"{product} {qty}".replace(' ', '+')
            url = f"https://www.dunzo.com/search/{search_query}"
            
            price_selectors = [
                '.product-price',
                '[data-testid="price"]',
                '.price-text'
            ]
            
            price = await self._scrape_price(url, price_selectors)
            
            if price:
                return {
                    'platform': 'Dunzo',
                    'price': price,
                    'url': url,
                    'scraped': True
                }
            
        except Exception as e:
            logger.debug(f"Dunzo scrape error: {e}")
        
        return None
    
    # Cache management methods
    
    def _get_cache_key(self, product: str, quantity: str) -> str:
        """Generate cache key from product name and quantity"""
        key_string = f"{product.lower().strip()}:{quantity}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _get_from_cache(self, key: str) -> Optional[List[Dict]]:
        """
        Get prices from cache if not expired.
        
        Returns:
            Cached prices or None if expired/missing
        """
        if key in self.cache:
            data, timestamp = self.cache[key]
            age = (datetime.now() - timestamp).total_seconds()
            
            if age < self.cache_ttl:
                logger.debug(f"Cache hit (age: {age:.0f}s)")
                return data
            else:
                logger.debug(f"Cache expired (age: {age:.0f}s)")
                del self.cache[key]
        
        return None
    
    def _save_to_cache(self, key: str, data: List[Dict]):
        """Save prices to cache with timestamp"""
        self.cache[key] = (data, datetime.now())
        logger.debug(f"Cached {len(data)} prices")
    
    def clear_cache(self):
        """Clear all cached prices"""
        self.cache.clear()
        logger.info("Price cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_items = len(self.cache)
        expired_items = 0
        
        for key, (data, timestamp) in self.cache.items():
            age = (datetime.now() - timestamp).total_seconds()
            if age >= self.cache_ttl:
                expired_items += 1
        
        return {
            "total_items": total_items,
            "active_items": total_items - expired_items,
            "expired_items": expired_items,
            "cache_ttl": self.cache_ttl
        }


# Global instance
price_fetcher = PriceFetcher(cache_ttl=3600)  # 1 hour cache
