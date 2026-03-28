#!/usr/bin/env python3
"""
Backend API Testing for Zambian School Management System
Tests the subjects API and login functionality
"""

import requests
import json
import sys
import time
from datetime import datetime

class SchoolAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.auth_cookies = None

    def log(self, message):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        self.log(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if 'data' in response_data:
                        self.log(f"   Response data count: {len(response_data['data']) if isinstance(response_data['data'], list) else 'N/A'}")
                except:
                    pass
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Response text: {response.text[:200]}")

            return success, response

        except Exception as e:
            self.log(f"❌ FAILED - Exception: {str(e)}")
            return False, None

    def test_login(self, email, password):
        """Test login and store session"""
        self.log(f"\n🔐 Testing login for {email}")
        
        success, response = self.run_test(
            f"Login ({email})",
            "POST",
            "/api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and response:
            try:
                response_data = response.json()
                if response_data.get('success') and response_data.get('user'):
                    user = response_data['user']
                    self.log(f"   ✅ Login successful for user: {user.get('name')} ({user.get('role')})")
                    self.log(f"   School ID: {user.get('schoolId')}")
                    # Store cookies for subsequent requests
                    self.auth_cookies = response.cookies
                    return True, user
                else:
                    self.log(f"   ❌ Login response missing success/user data")
                    return False, None
            except Exception as e:
                self.log(f"   ❌ Error parsing login response: {e}")
                return False, None
        
        return False, None

    def test_subjects_api(self):
        """Test subjects API endpoint"""
        self.log(f"\n📚 Testing subjects API")
        
        # Test without authentication first
        success, response = self.run_test(
            "Subjects API (unauthenticated)",
            "GET",
            "/api/subjects",
            401  # Should require authentication
        )
        
        if not success:
            self.log("   ⚠️  Expected 401 for unauthenticated request, but got different status")
        
        # Test with authentication
        if self.auth_cookies:
            # Use session with stored cookies
            success, response = self.run_test(
                "Subjects API (authenticated)",
                "GET",
                "/api/subjects",
                200
            )
            
            if success and response:
                try:
                    response_data = response.json()
                    if response_data.get('success') and 'data' in response_data:
                        subjects = response_data['data']
                        self.log(f"   ✅ Found {len(subjects)} subjects")
                        
                        # Log first few subjects for verification
                        for i, subject in enumerate(subjects[:5]):
                            self.log(f"   Subject {i+1}: {subject.get('name')} (Code: {subject.get('code')})")
                        
                        if len(subjects) > 5:
                            self.log(f"   ... and {len(subjects) - 5} more subjects")
                        
                        return True, subjects
                    else:
                        self.log(f"   ❌ Subjects response missing success/data")
                        return False, []
                except Exception as e:
                    self.log(f"   ❌ Error parsing subjects response: {e}")
                    return False, []
        else:
            self.log("   ❌ No authentication cookies available")
            return False, []
        
        return False, []

    def test_dev_fallback_login(self):
        """Test that dev fallback correctly infers school from email"""
        self.log(f"\n🔧 Testing dev fallback login behavior")
        
        # Test with headteacher@school.com - should infer school
        success, user = self.test_login("headteacher@school.com", "password123")
        
        if success and user:
            school_id = user.get('schoolId')
            if school_id:
                self.log(f"   ✅ Dev fallback working - inferred school ID: {school_id}")
                return True
            else:
                self.log(f"   ❌ Dev fallback failed - no school ID in user data")
                return False
        else:
            self.log(f"   ❌ Dev fallback test failed - login unsuccessful")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting Backend API Tests for Zambian School Management System")
        self.log("=" * 70)
        
        # Test 1: Dev fallback login
        dev_fallback_success = self.test_dev_fallback_login()
        
        # Test 2: Subjects API (should seed subjects if none exist)
        subjects_success, subjects = self.test_subjects_api()
        
        # Test 3: Alternative login credential
        self.log(f"\n🔐 Testing alternative login credential")
        alt_success, alt_user = self.test_login("admin@kalambakuwadaysecondaryschool.edu", "password123")
        
        # Test 4: Subjects API with alternative user
        if alt_success:
            alt_subjects_success, alt_subjects = self.test_subjects_api()
        else:
            alt_subjects_success = False
            alt_subjects = []
        
        # Summary
        self.log("\n" + "=" * 70)
        self.log("📊 TEST SUMMARY")
        self.log("=" * 70)
        self.log(f"Total tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        self.log("\n🎯 KEY FINDINGS:")
        self.log(f"✅ Dev fallback login: {'WORKING' if dev_fallback_success else 'FAILED'}")
        self.log(f"✅ Subjects API functionality: {'WORKING' if subjects_success else 'FAILED'}")
        self.log(f"✅ Subject seeding: {'WORKING' if len(subjects) > 0 else 'NO SUBJECTS FOUND'}")
        self.log(f"✅ Alternative login: {'WORKING' if alt_success else 'FAILED'}")
        
        # Check for specific issues mentioned in the problem
        if subjects_success and len(subjects) > 0:
            self.log(f"✅ ISSUE RESOLVED: Subjects are now available ({len(subjects)} subjects found)")
        else:
            self.log(f"❌ ISSUE PERSISTS: No subjects found - dropdown will be empty")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = SchoolAPITester()
    
    # Add a small delay to ensure server is ready
    time.sleep(2)
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())