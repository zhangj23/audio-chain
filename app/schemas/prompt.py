from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PromptBase(BaseModel):
    text: str
    week_start: datetime
    week_end: datetime

class PromptCreate(PromptBase):
    pass

class PromptResponse(PromptBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
