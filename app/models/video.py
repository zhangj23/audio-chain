from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class VideoSubmission(Base):
    __tablename__ = "video_submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    s3_key = Column(String, nullable=False)  # S3 object key for the video
    duration = Column(Float, nullable=False)  # Duration in seconds
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="video_submissions")
    group = relationship("Group", back_populates="video_submissions")
    prompt = relationship("Prompt", back_populates="video_submissions")

class WeeklyCompilation(Base):
    __tablename__ = "weekly_compilations"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    week_start = Column(DateTime, nullable=False)
    week_end = Column(DateTime, nullable=False)
    s3_key = Column(String, nullable=False)  # S3 object key for the final video
    music_track_id = Column(Integer, ForeignKey("music_tracks.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    group = relationship("Group", back_populates="weekly_compilations")
    music_track = relationship("MusicTrack", back_populates="compilations")

class MusicTrack(Base):
    __tablename__ = "music_tracks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    artist = Column(String, nullable=False)
    s3_key = Column(String, nullable=False)  # S3 object key for the music file
    duration = Column(Float, nullable=False)  # Duration in seconds
    genre = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    compilations = relationship("WeeklyCompilation", back_populates="music_track")
