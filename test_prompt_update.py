#!/usr/bin/env python3
"""
Test script to verify prompt update functionality works
"""
import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://129.161.69.91:8000"
TEST_GROUP_ID = 1  # Use group ID 1 for testing

def test_prompt_update():
    """Test the prompt update functionality"""
    
    # First, let's get a valid auth token by logging in
    print("🔐 Testing prompt update functionality...")
    
    # Login to get auth token
    login_data = {
        "email": "o@gmail.com",
        "password": "password123"
    }
    
    try:
        # Login
        print("1. Logging in...")
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(login_response.text)
            return False
            
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")
        
        # Test updating group prompt
        print("2. Testing prompt update...")
        prompt_data = {
            "text": f"Test prompt updated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "week_start": datetime.now().isoformat(),
            "week_end": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        prompt_response = requests.put(
            f"{BASE_URL}/groups/{TEST_GROUP_ID}/prompt",
            json=prompt_data,
            headers=headers
        )
        
        if prompt_response.status_code == 200:
            result = prompt_response.json()
            print("✅ Prompt update successful!")
            print(f"   New prompt ID: {result['id']}")
            print(f"   Prompt text: {result['text']}")
            print(f"   Message: {result['message']}")
            return True
        else:
            print(f"❌ Prompt update failed: {prompt_response.status_code}")
            print(prompt_response.text)
            return False
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False

if __name__ == "__main__":
    success = test_prompt_update()
    if success:
        print("\n🎉 Prompt update functionality is working!")
    else:
        print("\n💥 Prompt update functionality has issues!")
