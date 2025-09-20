from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.prompt import Prompt
from app.schemas.prompt import PromptResponse
from app.auth import get_current_user

router = APIRouter()

@router.get("/current", response_model=PromptResponse)
async def get_current_prompt(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the current active prompt
    current_time = datetime.utcnow()
    prompt = db.query(Prompt).filter(
        Prompt.is_active == True,
        Prompt.week_start <= current_time,
        Prompt.week_end >= current_time
    ).first()
    
    if not prompt:
        raise HTTPException(
            status_code=404,
            detail="No active prompt found"
        )
    
    return prompt

@router.get("/all", response_model=List[PromptResponse])
async def get_all_prompts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prompts = db.query(Prompt).filter(Prompt.is_active == True).all()
    return prompts
