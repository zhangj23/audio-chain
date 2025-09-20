"""
Scheduler for automatic weekly video compilations
Runs every Sunday at midnight to generate compilations for all active groups
"""

import asyncio
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import boto3
import json

from app.models.group import Group
from app.models.video import VideoSubmission, WeeklyCompilation
from app.database import get_db

# AWS Configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Lambda client
lambda_client = boto3.client(
    'lambda',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

async def weekly_compilation_scheduler():
    """
    Main scheduler function that runs every Sunday at midnight
    """
    print("🕐 Starting weekly compilation scheduler...")
    
    # Get current week's date range
    today = datetime.now()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    print(f"Processing compilations for week: {week_start.strftime('%Y-%m-%d')} to {week_end.strftime('%Y-%m-%d')}")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Get all active groups
        groups = db.query(Group).filter(Group.is_active == True).all()
        print(f"Found {len(groups)} active groups")
        
        results = []
        
        for group in groups:
            try:
                result = await process_group_compilation(group.id, week_start, week_end, db)
                results.append(result)
            except Exception as e:
                print(f"❌ Error processing group {group.id}: {str(e)}")
                results.append({
                    'group_id': group.id,
                    'status': 'error',
                    'error': str(e)
                })
        
        print(f"✅ Weekly compilation scheduler completed. Processed {len(results)} groups")
        return results
        
    except Exception as e:
        print(f"❌ Scheduler error: {str(e)}")
        return []
    finally:
        db.close()

async def process_group_compilation(group_id: int, week_start: datetime, week_end: datetime, db: Session):
    """
    Process compilation for a specific group
    """
    try:
        # Check if compilation already exists for this week
        existing_compilation = db.query(WeeklyCompilation).filter(
            WeeklyCompilation.group_id == group_id,
            WeeklyCompilation.week_start == week_start.date()
        ).first()
        
        if existing_compilation:
            print(f"⏭️ Compilation already exists for group {group_id}")
            return {
                'group_id': group_id,
                'status': 'skipped',
                'reason': 'compilation_already_exists'
            }
        
        # Check if there are video submissions for this week
        submissions = db.query(VideoSubmission).filter(
            VideoSubmission.group_id == group_id,
            VideoSubmission.created_at >= week_start,
            VideoSubmission.created_at <= week_end
        ).all()
        
        if not submissions:
            print(f"⏭️ No video submissions for group {group_id} this week")
            return {
                'group_id': group_id,
                'status': 'skipped',
                'reason': 'no_videos'
            }
        
        print(f"🎬 Processing group {group_id} with {len(submissions)} videos")
        
        # Create compilation record
        compilation = WeeklyCompilation(
            group_id=group_id,
            week_start=week_start.date(),
            week_end=week_end.date(),
            status="processing",
            s3_key="",  # Will be updated when processing completes
            created_at=datetime.now()
        )
        db.add(compilation)
        db.commit()
        db.refresh(compilation)
        
        # Trigger Lambda function
        await trigger_lambda_processing(group_id, compilation.id, week_start, week_end)
        
        return {
            'group_id': group_id,
            'status': 'processing',
            'compilation_id': compilation.id,
            'video_count': len(submissions)
        }
        
    except Exception as e:
        print(f"❌ Error processing group {group_id}: {str(e)}")
        raise

async def trigger_lambda_processing(group_id: int, compilation_id: int, week_start: datetime, week_end: datetime):
    """
    Trigger Lambda function to process video compilation
    """
    try:
        # Prepare Lambda payload
        payload = {
            "source": "weekly_scheduler",
            "group_id": group_id,
            "compilation_id": compilation_id,
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat()
        }
        
        # Invoke Lambda function
        response = lambda_client.invoke(
            FunctionName='weave-video-processor',
            InvocationType='Event',  # Asynchronous invocation
            Payload=json.dumps(payload)
        )
        
        print(f"✅ Lambda function invoked for group {group_id}, compilation {compilation_id}")
        
    except Exception as e:
        print(f"❌ Error invoking Lambda function: {e}")
        raise

def run_scheduler():
    """
    Run the scheduler (to be called by cron or similar)
    """
    asyncio.run(weekly_compilation_scheduler())

if __name__ == "__main__":
    run_scheduler()
