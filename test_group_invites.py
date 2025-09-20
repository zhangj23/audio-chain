#!/usr/bin/env python3
"""
Test script for the updated group creation with pending requests
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_group_creation_with_invites():
    """Test creating a group with invited users"""
    
    # Test data
    group_data = {
        "name": "Test Group with Invites",
        "description": "A test group to verify pending invite functionality",
        "invited_usernames": ["alice_wonder", "mike_codes", "sara_design"]
    }
    
    # Headers (you'll need to add authentication token)
    headers = {
        "Content-Type": "application/json",
        # "Authorization": "Bearer YOUR_TOKEN_HERE"
    }
    
    try:
        # Create group with invites
        response = requests.post(
            f"{BASE_URL}/groups/create",
            json=group_data,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Group created successfully!")
            print(f"Group ID: {result['id']}")
            print(f"Group Name: {result['name']}")
            print(f"Invite Code: {result['invite_code']}")
            print(f"Message: {result['message']}")
            print(f"Pending Requests: {len(result['pending_requests'])}")
            
            for pr in result['pending_requests']:
                print(f"  - Invited: {pr['invited_username']} (Status: {pr['status']})")
                
        else:
            print(f"❌ Error creating group: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def test_get_pending_invites():
    """Test getting pending invites for a user"""
    
    headers = {
        "Content-Type": "application/json",
        # "Authorization": "Bearer YOUR_TOKEN_HERE"
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/groups/pending-invites",
            headers=headers
        )
        
        if response.status_code == 200:
            invites = response.json()
            print(f"\n✅ Found {len(invites)} pending invites")
            for invite in invites:
                print(f"  - Group ID: {invite['group_id']}, Invited by: {invite['invited_by']}")
        else:
            print(f"❌ Error getting pending invites: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    print("Testing Group Creation with Pending Requests")
    print("=" * 50)
    
    test_group_creation_with_invites()
    test_get_pending_invites()
    
    print("\n" + "=" * 50)
    print("Test completed!")
