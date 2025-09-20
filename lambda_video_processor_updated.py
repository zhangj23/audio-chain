"""
AWS Lambda function for Weave video compilation (Updated Version)
Processes weekly video submissions and creates compilations
Handles both manual triggers and weekly scheduler
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
S3_BUCKET = os.environ.get('S3_BUCKET', 'weave-videos')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')  # Automatically provided by Lambda
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
        
        # Parse event
        source = event.get('source', 'unknown')
        group_id = event.get('group_id')
        compilation_id = event.get('compilation_id')
        week_start_str = event.get('week_start')
        week_end_str = event.get('week_end')
        
        if not group_id:
            raise ValueError("group_id is required")
        
        # Parse dates
        if week_start_str and week_end_str:
            week_start = datetime.fromisoformat(week_start_str.replace('Z', '+00:00'))
            week_end = datetime.fromisoformat(week_end_str.replace('Z', '+00:00'))
        else:
            # Default to current week
            today = datetime.now()
            week_start = today - timedelta(days=today.weekday())
            week_end = week_start + timedelta(days=6)
        
        print(f"Processing videos for group {group_id}, week: {week_start.strftime('%Y-%m-%d')} to {week_end.strftime('%Y-%m-%d')}")
        
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
        # Get videos for this group and week
        videos = get_group_videos_from_db(group_id, week_start, week_end)
        
        if not videos:
            print(f"No videos found for group {group_id}")
            update_compilation_status(compilation_id, "failed", "No videos found for this week")
            return {
                'group_id': group_id,
                'status': 'no_videos',
                'message': 'No videos found for this week'
            }
        
        print(f"Found {len(videos)} videos for group {group_id}")
        
        # Create compilation
        compilation_url = create_video_compilation(group_id, videos, week_start, week_end, ffmpeg_path)
        
        # Update compilation status in database
        if compilation_id:
            update_compilation_status(compilation_id, "completed", compilation_url)
        
        return {
            'group_id': group_id,
            'status': 'success',
            'compilation_url': compilation_url,
            'video_count': len(videos)
        }
        
    except Exception as e:
        print(f"Error processing group {group_id}: {e}")
        if compilation_id:
            update_compilation_status(compilation_id, "failed", str(e))
        raise

def get_group_videos_from_db(group_id: int, week_start: datetime, week_end: datetime) -> List[Dict[str, Any]]:
    """
    Get videos for a specific group within the date range from database
    """
    try:
        if not DATABASE_URL:
            print("⚠️ DATABASE_URL not set, using S3 fallback")
            return get_group_videos_from_s3(group_id, week_start, week_end)
        
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query videos for the group and date range
        query = """
        SELECT id, s3_key, duration, created_at
        FROM video_submissions 
        WHERE group_id = %s 
        AND created_at >= %s 
        AND created_at <= %s
        ORDER BY created_at
        """
        
        cursor.execute(query, (group_id, week_start, week_end))
        videos = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [dict(video) for video in videos]
        
    except Exception as e:
        print(f"Error getting videos from database: {e}")
        # Fallback to S3
        return get_group_videos_from_s3(group_id, week_start, week_end)

def get_group_videos_from_s3(group_id: int, week_start: datetime, week_end: datetime) -> List[Dict[str, Any]]:
    """
    Get videos for a specific group within the date range from S3 (fallback)
    """
    try:
        # List videos in the group's folder
        response = s3_client.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=f'groups/{group_id}/videos/'
        )
        
        videos = []
        if 'Contents' in response:
            for obj in response['Contents']:
                # Check if video is within the week
                video_date = obj['LastModified'].replace(tzinfo=None)
                if week_start <= video_date <= week_end:
                    videos.append({
                        'id': obj['Key'],
                        's3_key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': video_date
                    })
        
        return videos
    except Exception as e:
        print(f"Error getting videos from S3: {e}")
        return []

def update_compilation_status(compilation_id: int, status: str, s3_key: str = None):
    """
    Update compilation status in database
    """
    try:
        if not DATABASE_URL or not compilation_id:
            return
        
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        if status == "completed":
            query = """
            UPDATE weekly_compilations 
            SET status = %s, s3_key = %s, completed_at = %s 
            WHERE id = %s
            """
            cursor.execute(query, (status, s3_key, datetime.now(), compilation_id))
        else:
            query = """
            UPDATE weekly_compilations 
            SET status = %s, completed_at = %s 
            WHERE id = %s
            """
            cursor.execute(query, (status, datetime.now(), compilation_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✅ Updated compilation {compilation_id} status to {status}")
        
    except Exception as e:
        print(f"Error updating compilation status: {e}")

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
            
            # Create compilation
            compilation_path = os.path.join(temp_dir, f"compilation_{group_id}_{week_start.strftime('%Y%m%d')}.mp4")
            
            # Build FFmpeg command
            cmd = [ffmpeg_path, '-y']  # -y to overwrite output
            
            # Add intro
            if intro_path:
                cmd.extend(['-i', intro_path])
            
            # Add videos
            for video_file in video_files:
                cmd.extend(['-i', video_file])
            
            # Add outro
            if outro_path:
                cmd.extend(['-i', outro_path])
            
            # Create filter complex for concatenation
            filter_parts = []
            input_count = 0
            
            if intro_path:
                filter_parts.append(f"[{input_count}]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[intro]")
                input_count += 1
            
            for i in range(len(video_files)):
                filter_parts.append(f"[{input_count}]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[video{i}]")
                input_count += 1
            
            if outro_path:
                filter_parts.append(f"[{input_count}]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[outro]")
                input_count += 1
            
            # Concatenate all parts
            concat_parts = []
            if intro_path:
                concat_parts.append("[intro]")
            for i in range(len(video_files)):
                concat_parts.append(f"[video{i}]")
            if outro_path:
                concat_parts.append("[outro]")
            
            filter_complex = ';'.join(filter_parts) + f";{''.join(concat_parts)}concat=n={len(concat_parts)}:v=1:a=1[outv][outa]"
            
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
            s3_client.upload_file(compilation_path, S3_BUCKET, compilation_key)
            
            print(f"✅ Compilation uploaded to S3: {compilation_key}")
            return compilation_key
            
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
