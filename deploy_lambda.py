"""
Deployment script for Audio Chain Lambda function
Creates deployment package and uploads to AWS Lambda
"""

import os
import zipfile
import subprocess
import boto3
from pathlib import Path

def create_deployment_package():
    """Create deployment package for Lambda function"""
    print("📦 Creating Lambda deployment package...")
    
    # Create deployment directory
    deploy_dir = Path("lambda_deploy")
    deploy_dir.mkdir(exist_ok=True)
    
    # Install requirements
    print("Installing requirements...")
    subprocess.run([
        "pip", "install", "-r", "lambda_requirements.txt", 
        "-t", str(deploy_dir)
    ], check=True)
    
    # Copy Lambda function
    import shutil
    shutil.copy("lambda_video_processor.py", deploy_dir / "lambda_function.py")
    
    # Create ZIP package
    zip_path = "audio-chain-lambda.zip"
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(deploy_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, deploy_dir)
                zipf.write(file_path, arc_path)
    
    print(f"✅ Deployment package created: {zip_path}")
    return zip_path

def deploy_to_lambda(zip_path: str):
    """Deploy to AWS Lambda"""
    print("🚀 Deploying to AWS Lambda...")
    
    lambda_client = boto3.client('lambda')
    
    try:
        # Read the ZIP file
        with open(zip_path, 'rb') as f:
            zip_content = f.read()
        
        # Update function code
        response = lambda_client.update_function_code(
            FunctionName='audio-chain-video-processor',
            ZipFile=zip_content
        )
        
        print(f"✅ Lambda function updated: {response['FunctionName']}")
        
    except lambda_client.exceptions.ResourceNotFoundException:
        print("❌ Lambda function not found. Please create it first in AWS Console.")
    except Exception as e:
        print(f"❌ Error deploying: {str(e)}")

def main():
    """Main deployment function"""
    print("🎬 Audio Chain Lambda Deployment")
    print("=" * 40)
    
    # Create deployment package
    zip_path = create_deployment_package()
    
    # Deploy to Lambda
    deploy_to_lambda(zip_path)
    
    print("\n📋 Next Steps:")
    print("1. Set up EventBridge rule to trigger weekly")
    print("2. Configure environment variables:")
    print("   - DATABASE_URL")
    print("   - S3_BUCKET")
    print("   - AWS_REGION")
    print("3. Set timeout to 15 minutes")
    print("4. Set memory to 1024 MB")
    print("5. Add FFmpeg layer for video processing")

if __name__ == "__main__":
    main()
