from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import secrets
import string

from app.database import get_db
from app.models.user import User
from app.models.group import Group, GroupMember
from app.schemas.group import GroupCreate, GroupResponse, GroupJoin, GroupWithMembers, GroupMemberResponse
from app.auth import get_current_user

router = APIRouter()

def generate_invite_code(length: int = 8) -> str:
    """Generate a random invite code"""
    return ''.join(secrets.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("/create", response_model=GroupResponse)
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
    
    return db_group

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
            ) for member in members]
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
        ) for member in members]
    )
