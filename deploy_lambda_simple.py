"""
Simplified Lambda deployment script for Weave video processor
Uses pre-compiled dependencies to avoid compilation issues
"""

import os
import zipfile
import subprocess
import tempfile
import shutil
from pathlib import Path

def create_deployment_package():
    """
    Create a deployment package with simplified dependencies
    """
    print("📦 Creating simplified Lambda deployment package...")
    
    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        deploy_dir = Path(temp_dir) / "lambda_deploy"
        deploy_dir.mkdir()
        
        # Copy Lambda function code
        shutil.copy("lambda_video_processor_simple.py", deploy_dir / "lambda_function.py")
        
        # Install simplified requirements
        print("Installing simplified requirements...")
        subprocess.run([
            "pip", "install", "-r", "lambda_requirements_simple.txt",
            "-t", str(deploy_dir)
        ], check=True)
        
        # Create ZIP file
        zip_path = "weave-lambda-simple.zip"
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(deploy_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arc_path = os.path.relpath(file_path, deploy_dir)
                    zipf.write(file_path, arc_path)
        
        # Get file size
        file_size = os.path.getsize(zip_path) / (1024 * 1024)  # MB
        print(f"✅ Deployment package created: {zip_path} ({file_size:.1f} MB)")
        
        return zip_path

def upload_to_lambda(zip_path):
    """
    Upload the deployment package to Lambda
    """
    try:
        import boto3
        
        lambda_client = boto3.client('lambda')
        
        # Read the ZIP file
        with open(zip_path, 'rb') as zip_file:
            zip_content = zip_file.read()
        
        # Update Lambda function code
        response = lambda_client.update_function_code(
            FunctionName='weave-video-processor',
            ZipFile=zip_content
        )
        
        print(f"✅ Lambda function updated successfully")
        print(f"Function ARN: {response['FunctionArn']}")
        print(f"Last Modified: {response['LastModified']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error uploading to Lambda: {e}")
        return False

def main():
    """
    Main deployment function
    """
    print("🎬 Weave Lambda Deployment (Simplified)")
    print("=" * 50)
    
    try:
        # Create deployment package
        zip_path = create_deployment_package()
        
        # Ask user if they want to upload
        upload_choice = input("\n📤 Upload to Lambda? (y/n): ").lower().strip()
        
        if upload_choice == 'y':
            upload_to_lambda(zip_path)
        else:
            print(f"📁 Deployment package saved as: {zip_path}")
            print("You can manually upload this to your Lambda function.")
        
        print("\n✅ Deployment completed!")
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")

if __name__ == "__main__":
    main()
