from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class VideoSubmissionBase(BaseModel):
    group_id: int
    prompt_id: int
    duration: float

class VideoSubmissionCreate(VideoSubmissionBase):
    pass

class VideoSubmissionResponse(VideoSubmissionBase):
    id: int
    user_id: int
    s3_key: str
    submitted_at: datetime
    user: Optional[dict] = None  # Will include user info

    class Config:
        from_attributes = True

class WeeklyCompilationResponse(BaseModel):
    id: int
    group_id: int
    week_start: datetime
    week_end: datetime
    s3_key: Optional[str] = None
    music_track_id: Optional[int] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None

    class Config:
        from_attributes = True

class MusicTrackResponse(BaseModel):
    id: int
    title: str
    artist: str
    duration: float
    genre: Optional[str] = None

    class Config:
        from_attributes = True
