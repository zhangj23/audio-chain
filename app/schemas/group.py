from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupResponse(GroupBase):
    id: int
    invite_code: str
    created_by: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class GroupMemberResponse(BaseModel):
    id: int
    user_id: int
    group_id: int
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True

class GroupJoin(BaseModel):
    invite_code: str

class GroupWithMembers(GroupResponse):
    members: List[GroupMemberResponse] = []
