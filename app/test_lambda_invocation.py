#!/usr/bin/env python3
"""
Test Lambda function invocation to debug compilation issues
"""

import os
import sys
import json
import boto3
from dotenv import load_dotenv

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

def test_lambda_invocation():
    """Test if Lambda function can be invoked"""
    try:
        # Get AWS credentials
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        if not aws_access_key or not aws_secret_key:
            print("❌ AWS credentials not found in environment variables!")
            print("Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
            return
        
        print(f"🔗 Connecting to AWS Lambda in region: {aws_region}")
        
        # Initialize Lambda client
        lambda_client = boto3.client(
            'lambda',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=aws_region
        )
        
        # Test payload
        payload = {
            "source": "manual_test",
            "group_id": 3,
            "compilation_id": 1,
            "week_start": "2025-09-21T00:00:00",
            "week_end": "2025-09-27T23:59:59"
        }
        
        print("🧪 Testing Lambda function invocation...")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        # Try to invoke the Lambda function
        try:
            response = lambda_client.invoke(
                FunctionName='weave-video-processor',
                InvocationType='RequestResponse',  # Synchronous for testing
                Payload=json.dumps(payload)
            )
            
            print("✅ Lambda function invoked successfully!")
            print(f"Response Status Code: {response['StatusCode']}")
            
            # Read the response
            response_payload = json.loads(response['Payload'].read())
            print(f"Response Payload: {json.dumps(response_payload, indent=2)}")
            
        except lambda_client.exceptions.ResourceNotFoundException:
            print("❌ Lambda function 'weave-video-processor' not found!")
            print("The Lambda function may not be deployed yet.")
            print("\n🔧 To fix this:")
            print("1. Deploy the Lambda function using deploy_lambda.py")
            print("2. Or check if the function name is correct")
            
        except Exception as e:
            print(f"❌ Error invoking Lambda function: {e}")
            print(f"Error type: {type(e).__name__}")
            
    except Exception as e:
        print(f"❌ Error setting up Lambda client: {e}")
        print("\n🔍 Troubleshooting:")
        print("1. Check if your AWS credentials are correct")
        print("2. Ensure you have Lambda permissions")
        print("3. Verify the AWS region is correct")
        raise

if __name__ == "__main__":
    test_lambda_invocation()
