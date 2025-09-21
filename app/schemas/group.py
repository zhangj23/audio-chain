from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    invited_usernames: Optional[List[str]] = []  # List of usernames to invite

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

class GroupPendingRequestResponse(BaseModel):
    id: int
    group_id: int
    invited_username: str
    invited_by: int
    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GroupJoin(BaseModel):
    invite_code: str

class GroupInvite(BaseModel):
    usernames: List[str]  # List of usernames to invite

class GroupInviteResponse(BaseModel):
    message: str
    successful_invites: List[str]
    failed_invites: List[str]
    pending_requests: List[GroupPendingRequestResponse]

class GroupWithMembers(GroupResponse):
    members: List[GroupMemberResponse] = []
    pending_requests: List[GroupPendingRequestResponse] = []

class GroupCreateResponse(GroupResponse):
    pending_requests: List[GroupPendingRequestResponse] = []
    message: str