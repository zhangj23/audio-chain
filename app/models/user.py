from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_pic_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    group_memberships = relationship("GroupMember", back_populates="user")
    video_submissions = relationship("VideoSubmission", back_populates="user")
    created_groups = relationship("Group", back_populates="creator")
    sent_invites = relationship("GroupPendingRequest", foreign_keys="GroupPendingRequest.invited_by", back_populates="inviter")