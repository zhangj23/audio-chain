"""
AWS Lambda function for Weave video compilation (Fixed Version)
Processes weekly video submissions and creates compilations
FIXED: Properly uses date range from payload instead of default date range
"""

import json
import os
import boto3
import subprocess
import tempfile
from datetime import datetime, timedelta
from typing import List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

# AWS Configuration
S3_BUCKET = os.environ.get('S3_BUCKET', 'weave-video-project')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')  # Match Lambda region
DATABASE_URL = os.environ.get('DATABASE_URL')

# Initialize AWS clients
s3_client = boto3.client('s3', region_name=AWS_REGION)

def lambda_handler(event, context):
    """
    Main Lambda handler for video compilation
    """
    try:
        print("🎬 Starting Weave video compilation...")
        print(f"Event: {json.dumps(event)}")
        print(f"Region: {context.invoked_function_arn.split(':')[3]}")
        
        # Test FFmpeg availability
        try:
            result = subprocess.run(['/opt/bin/ffmpeg', '-version'], capture_output=True, text=True)
            if result.returncode == 0:
                print("✅ FFmpeg layer is available")
            else:
                print("❌ FFmpeg layer not found, trying system FFmpeg")
        except Exception as e:
            print(f"⚠️ FFmpeg test failed: {e}")
        
        # Determine FFmpeg path
        ffmpeg_path = '/opt/bin/ffmpeg' if os.path.exists('/opt/bin/ffmpeg') else 'ffmpeg'
        print(f"Using FFmpeg at: {ffmpeg_path}")
        
        # Parse event - FIXED: Use date range from payload
        source = event.get('source', 'unknown')
        group_id = event.get('group_id')
        compilation_id = event.get('compilation_id')
        week_start_str = event.get('week_start')
        week_end_str = event.get('week_end')
        
        print(f"📅 Received date range: {week_start_str} to {week_end_str}")
        
        if not group_id:
            raise ValueError("group_id is required")
        
        # Parse dates - FIXED: Better date parsing with proper error handling
        if week_start_str and week_end_str:
            try:
                # Handle different date formats
                if 'T' in week_start_str:
                    week_start = datetime.fromisoformat(week_start_str.replace('Z', '+00:00'))
                else:
                    week_start = datetime.fromisoformat(week_start_str)
                
                if 'T' in week_end_str:
                    week_end = datetime.fromisoformat(week_end_str.replace('Z', '+00:00'))
                else:
                    week_end = datetime.fromisoformat(week_end_str)
                
                # FIXED: Extend end date to include the full day
                # Set end time to 23:59:59 of the same day
                week_end = week_end.replace(hour=23, minute=59, second=59, microsecond=999999)
                    
                print(f"✅ Parsed dates: {week_start} to {week_end}")
            except Exception as e:
                print(f"⚠️ Error parsing dates: {e}, using defaults")
                # Default to current week if parsing fails
                today = datetime.now()
                week_start = today - timedelta(days=today.weekday())
                week_end = week_start + timedelta(days=6)
                # Also extend the default end date
                week_end = week_end.replace(hour=23, minute=59, second=59, microsecond=999999)
        else:
            # Default to current week
            today = datetime.now()
            week_start = today - timedelta(days=today.weekday())
            week_end = week_start + timedelta(days=6)
            # Also extend the default end date
            week_end = week_end.replace(hour=23, minute=59, second=59, microsecond=999999)
            print(f"⚠️ No date range provided, using default: {week_start} to {week_end}")
        
        print(f"Processing videos for group {group_id}, week: {week_start.strftime('%Y-%m-%d')} to {week_end.strftime('%Y-%m-%d')}")
        print(f"DEBUG: week_start type: {type(week_start)}, value: {week_start}")
        print(f"DEBUG: week_end type: {type(week_end)}, value: {week_end}")
        
        # Process the group
        result = process_group_videos(group_id, week_start, week_end, ffmpeg_path, compilation_id)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Video compilation completed',
                'result': result
            })
        }
        
    except Exception as e:
        print(f"❌ Lambda execution failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }

def process_group_videos(group_id: int, week_start: datetime, week_end: datetime, ffmpeg_path: str, compilation_id: int = None) -> Dict[str, Any]:
    """
    Process videos for a specific group
    """
    try:
        print(f"🔍 Looking for videos in group {group_id} between {week_start} and {week_end}")
        print(f"DEBUG: process_group_videos received week_start type: {type(week_start)}, value: {week_start}")
        print(f"DEBUG: process_group_videos received week_end type: {type(week_end)}, value: {week_end}")
        
        # Get videos for this group and week
        videos = get_group_videos_from_db(group_id, week_start, week_end)
        
        if not videos:
            print(f"No videos found for group {group_id}")
            return {
                'group_id': group_id,
                'videos_processed': 0,
                'status': 'no_videos'
            }
        
        print(f"Found {len(videos)} videos for group {group_id}")
        
        # Create compilation
        compilation_url = create_video_compilation(group_id, videos, week_start, week_end, ffmpeg_path)
        
        # Update compilation status in database
        if compilation_id:
            # Extract S3 key from the compilation URL or construct it
            # Ensure week_start is a datetime object
            if isinstance(week_start, str):
                week_start = datetime.fromisoformat(week_start.replace('Z', '+00:00'))
            compilation_key = f"compilations/{group_id}/{week_start.strftime('%Y%m%d')}_compilation.mp4"
            update_compilation_status(compilation_id, 'completed', compilation_key)
        
        return {
            'group_id': group_id,
            'videos_processed': len(videos),
            'status': 'completed',
            'compilation_url': compilation_url,
            'videos': videos
        }
        
    except Exception as e:
        print(f"❌ Error processing group {group_id}: {str(e)}")
        if compilation_id:
            update_compilation_status(compilation_id, 'failed', None)
        raise

def get_group_videos_from_db(group_id: int, week_start: datetime, week_end: datetime) -> List[Dict[str, Any]]:
    """
    Get videos for a specific group within the date range from database
    """
    try:
        if not DATABASE_URL:
            print("⚠️ DATABASE_URL not set, using S3 fallback")
            return get_group_videos_from_s3(group_id, week_start, week_end)
        
        print(f"🔗 Connecting to database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}")
        
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query videos for the group and date range
        query = """
        SELECT id, s3_key, duration, submitted_at as created_at
        FROM video_submissions 
        WHERE group_id = %s 
        AND submitted_at >= %s 
        AND submitted_at <= %s
        ORDER BY submitted_at
        """
        
        print(f"🔍 Querying videos for group {group_id} between {week_start} and {week_end}")
        cursor.execute(query, (group_id, week_start, week_end))
        videos = cursor.fetchall()
        
        print(f"📊 Found {len(videos)} videos in database")
        for video in videos:
            print(f"  - Video {video['id']}: {video['s3_key']} (submitted: {video['created_at']})")
        
        cursor.close()
        conn.close()
        
        return [dict(video) for video in videos]
        
    except Exception as e:
        print(f"❌ Error getting videos from database: {str(e)}")
        return []

def get_group_videos_from_s3(group_id: int, week_start: datetime, week_end: datetime) -> List[Dict[str, Any]]:
    """
    Fallback: Get videos from S3 (if database is not available)
    """
    try:
        print(f"🔍 Looking for videos in S3 bucket: {S3_BUCKET}")
        
        # List objects in the bucket
        response = s3_client.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=f'videos/{group_id}/'
        )
        
        videos = []
        if 'Contents' in response:
            for obj in response['Contents']:
                # Check if object is within date range
                if week_start <= obj['LastModified'].replace(tzinfo=None) <= week_end:
                    videos.append({
                        's3_key': obj['Key'],
                        'duration': 0,  # Unknown duration from S3 metadata
                        'created_at': obj['LastModified']
                    })
        
        print(f"📊 Found {len(videos)} videos in S3")
        return videos
        
    except Exception as e:
        print(f"❌ Error getting videos from S3: {str(e)}")
        return []

def create_video_compilation(group_id: int, videos: List[Dict[str, Any]], week_start: datetime, week_end: datetime, ffmpeg_path: str) -> str:
    """
    Create a video compilation from the group's videos
    """
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"Creating compilation in temporary directory: {temp_dir}")
            
            # Download videos
            video_files = []
            for i, video in enumerate(videos):
                video_path = os.path.join(temp_dir, f"video_{i}.mp4")
                s3_client.download_file(S3_BUCKET, video['s3_key'], video_path)
                video_files.append(video_path)
                print(f"Downloaded: {video['s3_key']}")
            
            # Create intro card
            intro_path = create_intro_card(group_id, week_start, week_end, temp_dir, ffmpeg_path)
            
            # Create outro card
            outro_path = create_outro_card(temp_dir, ffmpeg_path)
            
            # Build FFmpeg command
            cmd = [ffmpeg_path, '-y']  # -y to overwrite output
            
            # Input files
            input_files = []
            if intro_path:
                input_files.append(intro_path)
            input_files.extend(video_files)
            if outro_path:
                input_files.append(outro_path)

            for f in input_files:
                cmd.extend(['-i', f])
            
            # Filter complex for concatenation and scaling
            filter_parts = []
            concat_inputs = []
            for i, _ in enumerate(input_files):
                filter_parts.append(f"[{i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1[v{i}]")
                filter_parts.append(f"[{i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a{i}]")
                concat_inputs.append(f"[v{i}][a{i}]")
            
            filter_complex = ';'.join(filter_parts) + f";{''.join(concat_inputs)}concat=n={len(input_files)}:v=1:a=1[outv][outa]"
            
            # Ensure week_start is a datetime object
            if isinstance(week_start, str):
                week_start = datetime.fromisoformat(week_start.replace('Z', '+00:00'))
            compilation_path = os.path.join(temp_dir, f"compilation_{group_id}_{week_start.strftime('%Y%m%d')}.mp4")
            
            cmd.extend([
                '-filter_complex', filter_complex,
                '-map', '[outv]',
                '-map', '[outa]',
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'fast',
                '-crf', '23',
                compilation_path
            ])
            
            print(f"Running FFmpeg command: {' '.join(cmd)}")
            
            # Execute FFmpeg
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"FFmpeg error: {result.stderr}")
                raise Exception(f"FFmpeg failed: {result.stderr}")
            
            print("✅ Video compilation created successfully")
            
            # Upload to S3
            compilation_key = f"compilations/{group_id}/{week_start.strftime('%Y%m%d')}_compilation.mp4"
            print(f"📤 Uploading compilation to S3: {S3_BUCKET}/{compilation_key}")
            
            # Check if file exists before upload
            if not os.path.exists(compilation_path):
                raise Exception(f"Compilation file not found: {compilation_path}")
            
            # Upload file
            print(f"📤 Uploading {compilation_path} to {S3_BUCKET}/{compilation_key} in region {AWS_REGION}")
            try:
                s3_client.upload_file(compilation_path, S3_BUCKET, compilation_key)
                print(f"✅ Upload completed successfully")
            except Exception as e:
                print(f"❌ Upload failed: {e}")
                raise
            
            # Verify upload by checking if object exists
            try:
                s3_client.head_object(Bucket=S3_BUCKET, Key=compilation_key)
                print(f"✅ Compilation uploaded and verified in S3: {compilation_key}")
            except Exception as e:
                print(f"⚠️ Upload verification failed: {e}")
            
            # Generate presigned URL
            compilation_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET, 'Key': compilation_key},
                ExpiresIn=3600  # 1 hour
            )
            
            print(f"✅ Compilation uploaded to S3: {compilation_key}")
            return compilation_url
            
    except Exception as e:
        print(f"Error creating video compilation: {e}")
        raise

def create_intro_card(group_id: int, week_start: datetime, week_end: datetime, temp_dir: str, ffmpeg_path: str) -> str:
    """
    Create an intro card for the compilation
    """
    try:
        intro_path = os.path.join(temp_dir, "intro.mp4")
        
        # Create intro text
        # Ensure week_start is a datetime object
        if isinstance(week_start, str):
            week_start = datetime.fromisoformat(week_start.replace('Z', '+00:00'))
        intro_text = f"Week of {week_start.strftime('%B %d, %Y')}"
        
        # Create intro video using FFmpeg
        cmd = [
            ffmpeg_path, '-y',
            '-f', 'lavfi',
            '-i', f'color=c=black:size=1280x720:duration=3',
            '-vf', f'drawtext=text="{intro_text}":fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2',
            '-c:v', 'libx264',
            '-preset', 'fast',
            intro_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Intro card created")
            return intro_path
        else:
            print(f"⚠️ Intro card creation failed: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"Error creating intro card: {e}")
        return None

def create_outro_card(temp_dir: str, ffmpeg_path: str) -> str:
    """
    Create an outro card for the compilation
    """
    try:
        outro_path = os.path.join(temp_dir, "outro.mp4")
        
        # Create outro text
        outro_text = "Created with Weave"
        
        # Create outro video using FFmpeg
        cmd = [
            ffmpeg_path, '-y',
            '-f', 'lavfi',
            '-i', f'color=c=black:size=1280x720:duration=2',
            '-vf', f'drawtext=text="{outro_text}":fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2',
            '-c:v', 'libx264',
            '-preset', 'fast',
            outro_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Outro card created")
            return outro_path
        else:
            print(f"⚠️ Outro card creation failed: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"Error creating outro card: {e}")
        return None

def update_compilation_status(compilation_id: int, status: str, s3_key: str = None):
    """
    Update compilation status in database
    """
    try:
        if not DATABASE_URL:
            print("⚠️ DATABASE_URL not set, cannot update compilation status")
            return
        
        print(f"📝 Updating compilation {compilation_id} status to {status}")
        
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Update compilation status
        if s3_key:
            query = """
            UPDATE weekly_compilations 
            SET status = %s, s3_key = %s, completed_at = NOW()
            WHERE id = %s
            """
            cursor.execute(query, (status, s3_key, compilation_id))
        else:
            query = """
            UPDATE weekly_compilations 
            SET status = %s, completed_at = NOW()
            WHERE id = %s
            """
            cursor.execute(query, (status, compilation_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✅ Updated compilation {compilation_id} status to {status}")
        
    except Exception as e:
        print(f"❌ Error updating compilation status: {str(e)}")

