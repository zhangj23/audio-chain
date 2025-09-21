from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    invite_code = Column(String, unique=True, index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deadline_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    creator = relationship("User", back_populates="created_groups")
    members = relationship("GroupMember", back_populates="group")
    pending_requests = relationship("GroupPendingRequest", back_populates="group")
    video_submissions = relationship("VideoSubmission", back_populates="group")
    weekly_compilations = relationship("WeeklyCompilation", back_populates="group")
    prompts = relationship("Prompt", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    role = Column(String, default="member")  # member, admin
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="group_memberships")
    group = relationship("Group", back_populates="members")

class GroupPendingRequest(Base):
    __tablename__ = "group_pending_requests"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    invited_username = Column(String, nullable=False)  # Username of invited user
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who sent the invite
    status = Column(String, default="pending")  # pending, accepted, declined, expired
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime, nullable=True)  # Optional expiration date

    # Relationships
    group = relationship("Group", back_populates="pending_requests")
    inviter = relationship("User", foreign_keys=[invited_by])