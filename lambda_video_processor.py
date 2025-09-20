"""
AWS Lambda function for Audio Chain video compilation
Processes weekly video submissions and creates compilations
"""

import json
import boto3
import os
import tempfile
import subprocess
from datetime import datetime, timedelta
from typing import List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

# AWS clients
s3_client = boto3.client('s3')
lambda_client = boto3.client('lambda')

# Environment variables
DATABASE_URL = os.environ.get('DATABASE_URL')
S3_BUCKET = os.environ.get('S3_BUCKET', 'audio-chain-videos')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

def lambda_handler(event, context):
    """
    Main Lambda handler for video compilation
    """
    try:
        print("🎬 Starting Audio Chain video compilation...")
        
        # Get all active groups
        groups = get_active_groups()
        
        results = []
        for group in groups:
            print(f"Processing group: {group['name']} (ID: {group['id']})")
            
            # Process each group's weekly compilation
            result = process_group_compilation(group)
            results.append(result)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Video compilation completed successfully',
                'results': results
            })
        }
        
    except Exception as e:
        print(f"❌ Error in Lambda handler: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }

def get_active_groups() -> List[Dict[str, Any]]:
    """Get all active groups from database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT id, name, description 
        FROM groups 
        WHERE is_active = true
        """
        cursor.execute(query)
        groups = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [dict(group) for group in groups]
        
    except Exception as e:
        print(f"❌ Error getting groups: {str(e)}")
        return []

def process_group_compilation(group: Dict[str, Any]) -> Dict[str, Any]:
    """Process video compilation for a specific group"""
    group_id = group['id']
    group_name = group['name']
    
    try:
        # Get current week's video submissions
        submissions = get_week_submissions(group_id)
        
        if not submissions:
            print(f"No submissions found for group {group_name}")
            return {
                'group_id': group_id,
                'group_name': group_name,
                'status': 'no_submissions',
                'message': 'No video submissions found for this week'
            }
        
        print(f"Found {len(submissions)} submissions for {group_name}")
        
        # Download videos from S3
        video_files = download_videos(submissions)
        
        if not video_files:
            print(f"Failed to download videos for {group_name}")
            return {
                'group_id': group_id,
                'group_name': group_name,
                'status': 'download_failed',
                'message': 'Failed to download videos from S3'
            }
        
        # Create compilation
        compilation_path = create_video_compilation(video_files, group_name)
        
        if not compilation_path:
            print(f"Failed to create compilation for {group_name}")
            return {
                'group_id': group_id,
                'group_name': group_name,
                'status': 'compilation_failed',
                'message': 'Failed to create video compilation'
            }
        
        # Upload compilation to S3
        s3_key = upload_compilation(compilation_path, group_id)
        
        if not s3_key:
            print(f"Failed to upload compilation for {group_name}")
            return {
                'group_id': group_id,
                'group_name': group_name,
                'status': 'upload_failed',
                'message': 'Failed to upload compilation to S3'
            }
        
        # Save compilation record to database
        save_compilation_record(group_id, s3_key, submissions)
        
        # Clean up temporary files
        cleanup_temp_files(video_files + [compilation_path])
        
        print(f"✅ Successfully created compilation for {group_name}")
        return {
            'group_id': group_id,
            'group_name': group_name,
            'status': 'success',
            's3_key': s3_key,
            'submission_count': len(submissions)
        }
        
    except Exception as e:
        print(f"❌ Error processing group {group_name}: {str(e)}")
        return {
            'group_id': group_id,
            'group_name': group_name,
            'status': 'error',
            'message': str(e)
        }

def get_week_submissions(group_id: int) -> List[Dict[str, Any]]:
    """Get video submissions for the current week"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get current week's submissions
        current_time = datetime.utcnow()
        week_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = week_start - timedelta(days=week_start.weekday())  # Start of week
        
        query = """
        SELECT vs.id, vs.s3_key, vs.duration, vs.submitted_at,
               u.username, u.email
        FROM video_submissions vs
        JOIN users u ON vs.user_id = u.id
        WHERE vs.group_id = %s 
        AND vs.submitted_at >= %s
        ORDER BY vs.submitted_at ASC
        """
        
        cursor.execute(query, (group_id, week_start))
        submissions = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [dict(submission) for submission in submissions]
        
    except Exception as e:
        print(f"❌ Error getting submissions: {str(e)}")
        return []

def download_videos(submissions: List[Dict[str, Any]]) -> List[str]:
    """Download videos from S3 to temporary files"""
    video_files = []
    
    try:
        for submission in submissions:
            s3_key = submission['s3_key']
            temp_path = os.path.join(tempfile.gettempdir(), f"video_{submission['id']}.mp4")
            
            print(f"Downloading {s3_key} to {temp_path}")
            s3_client.download_file(S3_BUCKET, s3_key, temp_path)
            video_files.append(temp_path)
            
    except Exception as e:
        print(f"❌ Error downloading videos: {str(e)}")
        return []
    
    return video_files

def create_video_compilation(video_files: List[str], group_name: str) -> str:
    """Create video compilation using FFmpeg"""
    try:
        # Create input list for FFmpeg
        input_list_path = os.path.join(tempfile.gettempdir(), "input_list.txt")
        with open(input_list_path, 'w') as f:
            for video_file in video_files:
                f.write(f"file '{video_file}'\n")
        
        # Output path
        output_path = os.path.join(tempfile.gettempdir(), f"compilation_{group_name.replace(' ', '_')}.mp4")
        
        # FFmpeg command to concatenate videos
        cmd = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', input_list_path,
            '-c', 'copy',
            '-y',  # Overwrite output file
            output_path
        ]
        
        print(f"Running FFmpeg command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Compilation created: {output_path}")
            return output_path
        else:
            print(f"❌ FFmpeg error: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating compilation: {str(e)}")
        return None

def upload_compilation(compilation_path: str, group_id: int) -> str:
    """Upload compilation to S3"""
    try:
        # Generate S3 key
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        s3_key = f"compilations/{group_id}/weekly_{timestamp}.mp4"
        
        print(f"Uploading {compilation_path} to s3://{S3_BUCKET}/{s3_key}")
        
        s3_client.upload_file(
            compilation_path,
            S3_BUCKET,
            s3_key,
            ExtraArgs={'ContentType': 'video/mp4'}
        )
        
        print(f"✅ Upload successful: {s3_key}")
        return s3_key
        
    except Exception as e:
        print(f"❌ Error uploading compilation: {str(e)}")
        return None

def save_compilation_record(group_id: int, s3_key: str, submissions: List[Dict[str, Any]]):
    """Save compilation record to database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get current week dates
        current_time = datetime.utcnow()
        week_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = week_start - timedelta(days=week_start.weekday())
        week_end = week_start + timedelta(days=7)
        
        # Insert compilation record
        query = """
        INSERT INTO weekly_compilations (group_id, week_start, week_end, s3_key, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """
        
        cursor.execute(query, (group_id, week_start, week_end, s3_key, current_time))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        print(f"✅ Compilation record saved to database")
        
    except Exception as e:
        print(f"❌ Error saving compilation record: {str(e)}")

def cleanup_temp_files(file_paths: List[str]):
    """Clean up temporary files"""
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Cleaned up: {file_path}")
        except Exception as e:
            print(f"Warning: Could not clean up {file_path}: {str(e)}")

# For testing locally
if __name__ == "__main__":
    # Test event
    test_event = {
        "source": "manual_test"
    }
    
    # Test context
    class TestContext:
        def __init__(self):
            self.function_name = "audio-chain-video-processor"
            self.function_version = "1"
            self.invoked_function_arn = "arn:aws:lambda:us-east-1:123456789012:function:audio-chain-video-processor"
            self.memory_limit_in_mb = 512
            self.remaining_time_in_millis = 300000
    
    context = TestContext()
    
    # Run the handler
    result = lambda_handler(test_event, context)
    print(json.dumps(result, indent=2))
