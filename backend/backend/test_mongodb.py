"""
MongoDB Connection Test Script
Run this to verify your MongoDB connection is working correctly.
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def test_connection():
    """Test MongoDB connection and list databases"""
    
    print("=" * 60)
    print("MongoDB Connection Test")
    print("=" * 60)
    
    # Get MongoDB URL from environment
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'shop_assistant')
    
    if not mongo_url:
        print("❌ ERROR: MONGO_URL not found in .env file")
        print("\nPlease create a .env file with:")
        print("MONGO_URL=mongodb+srv://simha:narasimha@cluster0.nmaqxhm.mongodb.net/?appName=Cluster0")
        print("DB_NAME=shop_assistant")
        return
    
    print(f"\n📡 Connecting to MongoDB...")
    print(f"   Database: {db_name}")
    
    try:
        # Create client
        client = AsyncIOMotorClient(mongo_url)
        
        # Test connection by listing databases
        print("\n⏳ Testing connection...")
        db_list = await client.list_database_names()
        
        print("\n✅ Connection successful!")
        print(f"\n📊 Available databases:")
        for db in db_list:
            print(f"   - {db}")
        
        # Check if our database exists
        if db_name in db_list:
            print(f"\n✅ Database '{db_name}' exists")
            
            # List collections in our database
            db = client[db_name]
            collections = await db.list_collection_names()
            
            if collections:
                print(f"\n📁 Collections in '{db_name}':")
                for collection in collections:
                    count = await db[collection].count_documents({})
                    print(f"   - {collection} ({count} documents)")
            else:
                print(f"\n📝 Database '{db_name}' exists but has no collections yet")
                print("   Collections will be created automatically when you use the app")
        else:
            print(f"\n📝 Database '{db_name}' will be created automatically")
            print("   when you first insert data through the app")
        
        # Test write operation
        print(f"\n🧪 Testing write operation...")
        db = client[db_name]
        test_collection = db['_connection_test']
        
        result = await test_collection.insert_one({"test": "connection", "timestamp": "now"})
        print(f"✅ Write test successful! Inserted ID: {result.inserted_id}")
        
        # Clean up test document
        await test_collection.delete_one({"_id": result.inserted_id})
        print(f"🧹 Cleaned up test document")
        
        print("\n" + "=" * 60)
        print("✅ All tests passed! Your MongoDB connection is working!")
        print("=" * 60)
        print("\nYou can now start your backend server:")
        print("   cd backend")
        print("   python -m uvicorn server:app --reload")
        
    except Exception as e:
        print(f"\n❌ Connection failed!")
        print(f"\nError: {str(e)}")
        print("\n🔧 Troubleshooting:")
        print("   1. Check your MongoDB Atlas Network Access settings")
        print("   2. Verify your IP address is whitelisted (or use 0.0.0.0/0)")
        print("   3. Confirm username and password are correct")
        print("   4. Ensure your internet connection is working")
        print("   5. Check if MongoDB Atlas is accessible from your network")
    
    finally:
        # Close connection
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    asyncio.run(test_connection())
