#!/usr/bin/env python3
"""
Deploy updated Lambda function with region fix
"""
import boto3
import zipfile
import os
import json

# Configuration
LAMBDA_FUNCTION_NAME = 'weave-video-processor'
AWS_REGION = 'us-east-1'

def deploy_lambda():
    """Deploy the updated Lambda function"""
    print("🚀 Deploying updated Lambda function...")
    
    # Create deployment package
    print("📦 Creating deployment package...")
    with zipfile.ZipFile('lambda_deployment.zip', 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add the main Lambda function
        zip_file.write('lambda_function.py')
        
        # Add any other dependencies if needed
        # (psycopg2 and boto3 are already available in Lambda runtime)
    
    print("✅ Deployment package created: lambda_deployment.zip")
    
    # Initialize Lambda client
    lambda_client = boto3.client('lambda', region_name=AWS_REGION)
    
    try:
        # Read the deployment package
        with open('lambda_deployment.zip', 'rb') as zip_file:
            zip_content = zip_file.read()
        
        # Update the function code
        print(f"📤 Uploading to Lambda function: {LAMBDA_FUNCTION_NAME}")
        response = lambda_client.update_function_code(
            FunctionName=LAMBDA_FUNCTION_NAME,
            ZipFile=zip_content
        )
        
        print(f"✅ Lambda function updated successfully!")
        print(f"Function ARN: {response['FunctionArn']}")
        print(f"Last Modified: {response['LastModified']}")
        
        # Update environment variables to ensure correct region
        print("🔧 Updating environment variables...")
        lambda_client.update_function_configuration(
            FunctionName=LAMBDA_FUNCTION_NAME,
            Environment={
                'Variables': {
                    'S3_BUCKET': 'weave-video-project',
                    'AWS_REGION': 'us-east-1',  # Match Lambda region
                    'DATABASE_URL': os.getenv('DATABASE_URL', '')
                }
            }
        )
        
        print("✅ Environment variables updated!")
        
    except Exception as e:
        print(f"❌ Error updating Lambda function: {e}")
        return False
    
    finally:
        # Clean up
        if os.path.exists('lambda_deployment.zip'):
            os.remove('lambda_deployment.zip')
            print("🧹 Cleaned up deployment package")
    
    return True

if __name__ == "__main__":
    success = deploy_lambda()
    if success:
        print("🎉 Lambda deployment completed successfully!")
    else:
        print("💥 Lambda deployment failed!")
