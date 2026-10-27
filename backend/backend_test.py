import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path

class SmartSpendAPITester:
    def __init__(self):
        self.base_url = "https://pricepal-30.preview.emergentagent.com/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            # Remove Content-Type for file uploads
            headers.pop('Content-Type', None)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON)")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        test_user = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Token: {self.token[:20]}...")
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # Try to login with a test user
        login_data = {
            "email": "test@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_bill_upload(self):
        """Test bill upload with a sample image"""
        # Create a simple test image file
        try:
            from PIL import Image
            import io
            
            # Create a simple test image with some text-like content
            img = Image.new('RGB', (400, 600), color='white')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            
            files = {'file': ('test_bill.png', img_bytes, 'image/png')}
            
            success, response = self.run_test(
                "Bill Upload",
                "POST",
                "bills/upload",
                200,
                files=files
            )
            
            if success:
                print(f"   Bill ID: {response.get('bill', {}).get('id', 'N/A')}")
                print(f"   Items found: {len(response.get('items_with_prices', []))}")
                print(f"   Total amount: ₹{response.get('bill', {}).get('total_amount', 0)}")
                print(f"   Savings potential: ₹{response.get('total_savings_potential', 0)}")
            
            return success
            
        except ImportError:
            self.log_test("Bill Upload", False, "PIL not available for test image creation")
            return False
        except Exception as e:
            self.log_test("Bill Upload", False, f"Error creating test image: {str(e)}")
            return False

    def test_get_bills(self):
        """Test getting user's bills"""
        success, response = self.run_test(
            "Get Bills",
            "GET",
            "bills",
            200
        )
        
        if success:
            print(f"   Bills found: {len(response)}")
        
        return success

    def test_get_insights(self):
        """Test getting spending insights"""
        success, response = self.run_test(
            "Get Insights",
            "GET",
            "insights",
            200
        )
        
        if success:
            print(f"   Total spending: ₹{response.get('total_spending', 0)}")
            print(f"   Categories: {len(response.get('category_breakdown', {}))}")
            print(f"   Monthly trend points: {len(response.get('monthly_trend', []))}")
        
        return success

    def test_generate_shopping_list(self):
        """Test shopping list generation"""
        budget = 5000
        success, response = self.run_test(
            "Generate Shopping List",
            "POST",
            f"shopping-list/generate?budget={budget}",
            200
        )
        
        if success:
            print(f"   Budget: ₹{response.get('budget', 0)}")
            print(f"   Items: {len(response.get('items', []))}")
            print(f"   Total estimated: ₹{response.get('total_estimated', 0)}")
        
        return success

    def test_get_shopping_lists(self):
        """Test getting saved shopping lists"""
        success, response = self.run_test(
            "Get Shopping Lists",
            "GET",
            "shopping-lists",
            200
        )
        
        if success:
            print(f"   Saved lists: {len(response)}")
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Smart Shopping Assistant API Tests")
        print(f"   Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test authentication flow
        if not self.test_user_registration():
            print("\n⚠️  Registration failed, trying login...")
            if not self.test_user_login():
                print("❌ Both registration and login failed. Stopping tests.")
                return False
        
        # Test protected endpoints
        self.test_get_current_user()
        self.test_bill_upload()
        self.test_get_bills()
        self.test_get_insights()
        self.test_generate_shopping_list()
        self.test_get_shopping_lists()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = SmartSpendAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": f"{(tester.tests_passed/tester.tests_run)*100:.1f}%" if tester.tests_run > 0 else "0%",
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())