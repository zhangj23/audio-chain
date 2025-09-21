from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import secrets
import string
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.group import Group, GroupMember, GroupPendingRequest
from app.schemas.group import (
    GroupCreate, 
    GroupResponse, 
    GroupJoin, 
    GroupWithMembers, 
    GroupMemberResponse,
    GroupPendingRequestResponse,
    GroupCreateResponse
)
from app.auth import get_current_user

router = APIRouter()

def generate_invite_code(length: int = 8) -> str:
    """Generate a random invite code"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))

@router.post("/create", response_model=GroupCreateResponse)
async def create_group(
    group: GroupCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Generate unique invite code
    invite_code = generate_invite_code()
    while db.query(Group).filter(Group.invite_code == invite_code).first():
        invite_code = generate_invite_code()
    
    # Create group
    db_group = Group(
        name=group.name,
        description=group.description,
        invite_code=invite_code,
        created_by=current_user.id
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # Add creator as admin member
    db_member = GroupMember(
        user_id=current_user.id,
        group_id=db_group.id,
        role="admin"
    )
    db.add(db_member)
    db.commit()
    
    # Handle pending requests for invited users
    pending_requests = []
    if group.invited_usernames:
        for username in group.invited_usernames:
            # Check if user exists
            invited_user = db.query(User).filter(User.username == username).first()
            if invited_user:
                # Check if user is already a member (shouldn't happen, but safety check)
                existing_member = db.query(GroupMember).filter(
                    GroupMember.user_id == invited_user.id,
                    GroupMember.group_id == db_group.id
                ).first()
                
                if not existing_member:
                    # Create pending request
                    pending_request = GroupPendingRequest(
                        group_id=db_group.id,
                        invited_username=username,
                        invited_by=current_user.id,
                        status="pending",
                        expires_at=datetime.utcnow() + timedelta(days=7)  # 7 days to accept
                    )
                    db.add(pending_request)
                    pending_requests.append(pending_request)
        
        db.commit()
        
        # Refresh pending requests to get IDs
        for pr in pending_requests:
            db.refresh(pr)
    
    # Prepare response
    pending_request_responses = [
        GroupPendingRequestResponse(
            id=pr.id,
            group_id=pr.group_id,
            invited_username=pr.invited_username,
            invited_by=pr.invited_by,
            status=pr.status,
            created_at=pr.created_at,
            expires_at=pr.expires_at
        ) for pr in pending_requests
    ]
    
    message = f"Group '{group.name}' created successfully!"
    if pending_requests:
        message += f" {len(pending_requests)} invitation(s) sent to users."
    
    return GroupCreateResponse(
        id=db_group.id,
        name=db_group.name,
        description=db_group.description,
        invite_code=db_group.invite_code,
        created_by=db_group.created_by,
        is_active=db_group.is_active,
        created_at=db_group.created_at,
        pending_requests=pending_request_responses,
        message=message
    )

@router.post("/join", response_model=GroupResponse)
async def join_group(
    group_join: GroupJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find group by invite code
    group = db.query(Group).filter(Group.invite_code == group_join.invite_code).first()
    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )
    
    # Check if user is already a member
    existing_member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group.id
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=400,
            detail="You are already a member of this group"
        )
    
    # Check if there's a pending request for this user
    pending_request = db.query(GroupPendingRequest).filter(
        GroupPendingRequest.group_id == group.id,
        GroupPendingRequest.invited_username == current_user.username,
        GroupPendingRequest.status == "pending"
    ).first()
    
    if pending_request:
        # Update pending request status
        pending_request.status = "accepted"
        db.commit()
    
    # Add user to group
    db_member = GroupMember(
        user_id=current_user.id,
        group_id=group.id,
        role="member"
    )
    db.add(db_member)
    db.commit()
    
    return group

@router.get("/my-groups", response_model=List[GroupWithMembers])
async def get_my_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get groups where user is a member
    groups = db.query(Group).join(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    result = []
    for group in groups:
        members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        pending_requests = db.query(GroupPendingRequest).filter(
            GroupPendingRequest.group_id == group.id,
            GroupPendingRequest.status == "pending"
        ).all()
        
        group_data = GroupWithMembers(
            id=group.id,
            name=group.name,
            description=group.description,
            invite_code=group.invite_code,
            created_by=group.created_by,
            is_active=group.is_active,
            created_at=group.created_at,
            members=[GroupMemberResponse(
                id=member.id,
                user_id=member.user_id,
                group_id=member.group_id,
                role=member.role,
                joined_at=member.joined_at
            ) for member in members],
            pending_requests=[GroupPendingRequestResponse(
                id=pr.id,
                group_id=pr.group_id,
                invited_username=pr.invited_username,
                invited_by=pr.invited_by,
                status=pr.status,
                created_at=pr.created_at,
                expires_at=pr.expires_at
            ) for pr in pending_requests]
        )
        result.append(group_data)
    
    return result

@router.get("/{group_id}", response_model=GroupWithMembers)
async def get_group(
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
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )
    
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    pending_requests = db.query(GroupPendingRequest).filter(
        GroupPendingRequest.group_id == group_id,
        GroupPendingRequest.status == "pending"
    ).all()
    
    return GroupWithMembers(
        id=group.id,
        name=group.name,
        description=group.description,
        invite_code=group.invite_code,
        created_by=group.created_by,
        is_active=group.is_active,
        created_at=group.created_at,
        members=[GroupMemberResponse(
            id=member.id,
            user_id=member.user_id,
            group_id=member.group_id,
            role=member.role,
            joined_at=member.joined_at
        ) for member in members],
        pending_requests=[GroupPendingRequestResponse(
            id=pr.id,
            group_id=pr.group_id,
            invited_username=pr.invited_username,
            invited_by=pr.invited_by,
            status=pr.status,
            created_at=pr.created_at,
            expires_at=pr.expires_at
        ) for pr in pending_requests]
    )

@router.get("/pending-invites", response_model=List[GroupPendingRequestResponse])
async def get_pending_invites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending invites for the current user"""
    pending_requests = db.query(GroupPendingRequest).filter(
        GroupPendingRequest.invited_username == current_user.username,
        GroupPendingRequest.status == "pending",
        GroupPendingRequest.expires_at > datetime.utcnow()  # Not expired
    ).all()
    
    return [GroupPendingRequestResponse(
        id=pr.id,
        group_id=pr.group_id,
        invited_username=pr.invited_username,
        invited_by=pr.invited_by,
        status=pr.status,
        created_at=pr.created_at,
        expires_at=pr.expires_at
    ) for pr in pending_requests]