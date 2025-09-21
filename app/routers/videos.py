from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import boto3
import os
import uuid
from datetime import datetime, timedelta
import asyncio
import json

from app.database import get_db
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.video import VideoSubmission, WeeklyCompilation, MusicTrack
from app.models.prompt import Prompt
from app.schemas.video import VideoSubmissionResponse, WeeklyCompilationResponse, MusicTrackResponse
from app.auth import get_current_user

router = APIRouter()

# AWS S3 configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME", "weave-videos")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

# Lambda client for video processing
lambda_client = boto3.client(
    'lambda',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

@router.post("/upload", response_model=VideoSubmissionResponse)
async def upload_video(
    group_id: int,
    prompt_id: int,
    duration: float,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user is a member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )
    
    # Check if prompt exists and is active
    prompt = db.query(Prompt).filter(
        Prompt.id == prompt_id,
        Prompt.is_active == True
    ).first()
    
    if not prompt:
        raise HTTPException(
            status_code=404,
            detail="Prompt not found or inactive"
        )
    
    # Check if user has already submitted for this prompt
    existing_submission = db.query(VideoSubmission).filter(
        VideoSubmission.user_id == current_user.id,
        VideoSubmission.group_id == group_id,
        VideoSubmission.prompt_id == prompt_id
    ).first()
    
    if existing_submission:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted a video for this prompt"
        )
    
    # Generate unique S3 key
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
    s3_key = f"videos/{group_id}/{current_user.id}/{uuid.uuid4()}.{file_extension}"
    
    try:
        # Upload to S3
        s3_client.upload_fileobj(
            file.file,
            AWS_BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': file.content_type}
        )
        
        # Save to database
        db_submission = VideoSubmission(
            user_id=current_user.id,
            group_id=group_id,
            prompt_id=prompt_id,
            s3_key=s3_key,
            duration=duration
        )
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)
        
        return db_submission
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload video: {str(e)}"
        )

@router.get("/submissions/{group_id}", response_model=List[VideoSubmissionResponse])
async def get_group_submissions(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user is a member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )
    
    submissions = db.query(VideoSubmission).filter(
        VideoSubmission.group_id == group_id
    ).all()
    
    return submissions

@router.get("/compilations/{group_id}", response_model=List[WeeklyCompilationResponse])
async def get_group_compilations(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user is a member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )
    
    compilations = db.query(WeeklyCompilation).filter(
        WeeklyCompilation.group_id == group_id
    ).all()
    
    return compilations

@router.get("/music-tracks", response_model=List[MusicTrackResponse])
async def get_music_tracks(
    db: Session = Depends(get_db)
):
    tracks = db.query(MusicTrack).filter(MusicTrack.is_active == True).all()
    return tracks

@router.get("/download-url/{submission_id}")
async def get_download_url(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = db.query(VideoSubmission).filter(
        VideoSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Video submission not found"
        )
    
    # Check if user is a member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == submission.group_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )
    
    try:
        # Generate presigned URL for download
        download_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': AWS_BUCKET_NAME, 'Key': submission.s3_key},
            ExpiresIn=3600  # 1 hour
        )
        
        return {"download_url": download_url}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate download URL: {str(e)}"
        )

@router.post("/generate-compilation/{group_id}")
async def generate_compilation(
    group_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger video compilation for a group
    """
    # Check if user is a member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )
    
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )
    
    # Check if there are any video submissions for this group
    submissions = db.query(VideoSubmission).filter(
        VideoSubmission.group_id == group_id
    ).all()
    
    if not submissions:
        raise HTTPException(
            status_code=400,
            detail="No video submissions found for this group"
        )
    
    # Check if compilation already exists for this week
    today = datetime.now()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    existing_compilation = db.query(WeeklyCompilation).filter(
        WeeklyCompilation.group_id == group_id,
        WeeklyCompilation.week_start == week_start.date()
    ).first()
    
    if existing_compilation:
        raise HTTPException(
            status_code=400,
            detail="Compilation already exists for this week"
        )
    
    try:
        # Create a pending compilation record
        compilation = WeeklyCompilation(
            group_id=group_id,
            week_start=week_start.date(),
            week_end=week_end.date(),
            status="processing",
            s3_key=None  # Will be updated when processing completes
        )
        db.add(compilation)
        db.commit()
        db.refresh(compilation)
        
        # Trigger Lambda function asynchronously
        background_tasks.add_task(
            trigger_lambda_processing,
            group_id, compilation.id
        )
        
        return {
            "message": "Video compilation started",
            "compilation_id": compilation.id,
            "status": "processing",
            "estimated_completion": "5-10 minutes"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start compilation: {str(e)}"
        )

async def trigger_lambda_processing(group_id: int, compilation_id: int):
    """
    Trigger Lambda function to process video compilation
    """
    try:
        # Prepare Lambda payload
        payload = {
            "source": "manual_trigger",
            "group_id": group_id,
            "compilation_id": compilation_id,
            "week_start": (datetime.now() - timedelta(days=datetime.now().weekday())).isoformat(),
            "week_end": (datetime.now() - timedelta(days=datetime.now().weekday()) + timedelta(days=6)).isoformat()
        }
        
        # Invoke Lambda function
        response = lambda_client.invoke(
            FunctionName='weave-video-processor',
            InvocationType='Event',  # Asynchronous invocation
            Payload=json.dumps(payload)
        )
        
        print(f"Lambda function invoked for group {group_id}, compilation {compilation_id}")
        
    except Exception as e:
        print(f"Error invoking Lambda function: {e}")
        # Update compilation status to failed
        # This would require a database session, but for now just log the error

@router.get("/compilation-status/{compilation_id}")
async def get_compilation_status(
    compilation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the status of a video compilation
    """
    compilation = db.query(WeeklyCompilation).filter(
        WeeklyCompilation.id == compilation_id
    ).first()
    
    if not compilation:
        raise HTTPException(
            status_code=404,
            detail="Compilation not found"
        )
    
    # Check if user is a member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == compilation.group_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )
    
    response_data = {
        "id": compilation.id,
        "group_id": compilation.group_id,
        "week_start": compilation.week_start,
        "week_end": compilation.week_end,
        "status": compilation.status,
        "created_at": compilation.created_at,
        "completed_at": compilation.completed_at
    }
    
    # If compilation is completed, include download URL
    if compilation.status == "completed" and compilation.s3_key:
        try:
            download_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': AWS_BUCKET_NAME, 'Key': compilation.s3_key},
                ExpiresIn=3600  # 1 hour
            )
            response_data["download_url"] = download_url
        except Exception as e:
            print(f"Error generating download URL: {e}")
    
    return response_data

@router.post("/test-compilation/{group_id}")
async def test_compilation(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test endpoint to trigger compilation without Lambda (for testing)
    """
    # Check if user is a member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )
    
    # Get video submissions for this group
    submissions = db.query(VideoSubmission).filter(
        VideoSubmission.group_id == group_id
    ).all()
    
    if not submissions:
        raise HTTPException(
            status_code=400,
            detail="No video submissions found for this group"
        )
    
    return {
        "message": "Test compilation endpoint",
        "group_id": group_id,
        "submission_count": len(submissions),
        "submissions": [
            {
                "id": sub.id,
                "s3_key": sub.s3_key,
                "duration": sub.duration,
                "created_at": sub.created_at
            }
            for sub in submissions
        ]
    }
