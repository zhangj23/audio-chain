from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)  # Add group_id column
    week_start = Column(DateTime, nullable=False)
    week_end = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    group = relationship("Group", back_populates="prompts")
    video_submissions = relationship("VideoSubmission", back_populates="prompt")
