from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import secrets
import string
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.group import Group, GroupMember, GroupPendingRequest
from app.models.video import VideoSubmission
from app.models.prompt import Prompt
from app.schemas.group import (
    GroupCreate, 
    GroupResponse, 
    GroupJoin, 
    GroupWithMembers, 
    GroupMemberResponse,
    GroupMemberWithUserResponse,
    GroupPendingRequestResponse,
    GroupCreateResponse,
    GroupInvite,
    GroupInviteResponse,
    GroupInviteWithDetails,
    GroupUpdate,
    GroupUpdateResponse,
    PromptUpdate,
    PromptUpdateResponse
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
        created_by=current_user.id,
        deadline_at=getattr(group, 'deadline_at', None)
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
        deadline_at=db_group.deadline_at,
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
    from sqlalchemy.orm import joinedload
    
    # Get groups where user is a member
    groups = db.query(Group).join(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    result = []
    for group in groups:
        # Get members with user data
        members = db.query(GroupMember).join(User).filter(
            GroupMember.group_id == group.id
        ).options(joinedload(GroupMember.user)).all()
        
        pending_requests = db.query(GroupPendingRequest).filter(
            GroupPendingRequest.group_id == group.id,
            GroupPendingRequest.status == "pending"
        ).all()
        
        # Get current active prompt for this group
        current_prompt = db.query(Prompt).filter(
            Prompt.group_id == group.id,
            Prompt.is_active == True
        ).first()
        
        print(f"DEBUG: Group {group.id} ({group.name}) - Found prompt: {current_prompt}")
        
        # Serialize current prompt if it exists
        current_prompt_data = None
        if current_prompt:
            current_prompt_data = {
                "id": current_prompt.id,
                "text": current_prompt.text,
                "week_start": current_prompt.week_start.isoformat() if current_prompt.week_start else None,
                "week_end": current_prompt.week_end.isoformat() if current_prompt.week_end else None,
                "is_active": current_prompt.is_active
            }
            print(f"DEBUG: Group {group.id} - Serialized prompt: {current_prompt_data}")
        else:
            print(f"DEBUG: Group {group.id} - No active prompt found")
        
        group_data = GroupWithMembers(
            id=group.id,
            name=group.name,
            description=group.description,
            deadline_at=group.deadline_at,
            invite_code=group.invite_code,
            created_by=group.created_by,
            is_active=group.is_active,
            created_at=group.created_at,
            members=[GroupMemberWithUserResponse(
                id=member.id,
                user_id=member.user_id,
                group_id=member.group_id,
                role=member.role,
                joined_at=member.joined_at,
                user={
                    "id": member.user.id,
                    "username": member.user.username,
                    "email": member.user.email,
                    "created_at": member.user.created_at.isoformat() if member.user.created_at else None
                }
            ) for member in members],
            pending_requests=[GroupPendingRequestResponse(
                id=pr.id,
                group_id=pr.group_id,
                invited_username=pr.invited_username,
                invited_by=pr.invited_by,
                status=pr.status,
                created_at=pr.created_at,
                expires_at=pr.expires_at
            ) for pr in pending_requests],
            current_prompt=current_prompt_data
        )
        
        print(f"DEBUG: Group {group.id} - Final group_data.current_prompt: {group_data.current_prompt}")
        result.append(group_data)
    
    return result

@router.get("/pending-invites", response_model=List[GroupInviteWithDetails])
async def get_pending_invites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending invites for the current user with full details"""
    from sqlalchemy.orm import joinedload
    
    pending_requests = db.query(GroupPendingRequest).join(Group).join(User, GroupPendingRequest.invited_by == User.id).filter(
        GroupPendingRequest.invited_username == current_user.username,
        GroupPendingRequest.status == "pending"
    ).options(
        joinedload(GroupPendingRequest.group),
        joinedload(GroupPendingRequest.inviter)
    ).all()
    
    print(f"DEBUG: Found {len(pending_requests)} pending requests")
    for pr in pending_requests:
        print(f"DEBUG: Request {pr.id} - Group: {pr.group.name if pr.group else 'None'}, Inviter: {pr.inviter.username if pr.inviter else 'None'}")
    
    result = []
    for pr in pending_requests:
        # Check if expired
        is_expired = pr.expires_at and pr.expires_at < datetime.utcnow()
        
        result.append(GroupInviteWithDetails(
            id=pr.id,
            group_id=pr.group_id,
            invited_username=pr.invited_username,
            invited_by=pr.invited_by,
            status="expired" if is_expired else pr.status,
            created_at=pr.created_at,
            expires_at=pr.expires_at,
            group={
                "id": pr.group.id,
                "name": pr.group.name,
                "description": pr.group.description
            },
            invited_by_user={
                "id": pr.inviter.id,
                "username": pr.inviter.username
            }
        ))
    
    return result

@router.get("/users", response_model=List[dict])
async def get_users_for_invite(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of users that can be invited to groups"""
    # Get all users except the current user
    users = db.query(User).filter(User.id != current_user.id).all()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        for user in users
    ]

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
    
    # Get members with user data
    from sqlalchemy.orm import joinedload
    members = db.query(GroupMember).join(User).filter(
        GroupMember.group_id == group_id
    ).options(joinedload(GroupMember.user)).all()
    
    pending_requests = db.query(GroupPendingRequest).filter(
        GroupPendingRequest.group_id == group_id,
        GroupPendingRequest.status == "pending"
    ).all()
    
    return GroupWithMembers(
        id=group.id,
        name=group.name,
        description=group.description,
        deadline_at=group.deadline_at,
        invite_code=group.invite_code,
        created_by=group.created_by,
        is_active=group.is_active,
        created_at=group.created_at,
        members=[GroupMemberWithUserResponse(
            id=member.id,
            user_id=member.user_id,
            group_id=member.group_id,
            role=member.role,
            joined_at=member.joined_at,
            user={
                "id": member.user.id,
                "username": member.user.username,
                "email": member.user.email,
                "created_at": member.user.created_at.isoformat() if member.user.created_at else None
            }
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

@router.get("/{group_id}/video-stats")
async def get_group_video_stats(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get video submission statistics for a group"""
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
    
    # Get total video submissions for this group
    total_submissions = db.query(VideoSubmission).filter(
        VideoSubmission.group_id == group_id
    ).count()
    
    # Get unique users who have submitted videos
    unique_submitters = db.query(VideoSubmission.user_id).filter(
        VideoSubmission.group_id == group_id
    ).distinct().count()
    
    # Get total members in the group
    total_members = db.query(GroupMember).filter(
        GroupMember.group_id == group_id
    ).count()
    
    return {
        "group_id": group_id,
        "total_submissions": total_submissions,
        "unique_submitters": unique_submitters,
        "total_members": total_members,
        "submission_rate": round((unique_submitters / total_members) * 100, 1) if total_members > 0 else 0
    }

@router.post("/{group_id}/invite", response_model=GroupInviteResponse)
async def invite_users_to_group(
    group_id: int,
    invite_data: GroupInvite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite users to an existing group"""
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
    
    # Get the group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )
    
    successful_invites = []
    failed_invites = []
    pending_requests = []
    
    for username in invite_data.usernames:
        # Check if user exists
        invited_user = db.query(User).filter(User.username == username).first()
        if not invited_user:
            failed_invites.append(f"{username} (user not found)")
            continue
            
        # Check if user is already a member
        existing_member = db.query(GroupMember).filter(
            GroupMember.user_id == invited_user.id,
            GroupMember.group_id == group_id
        ).first()
        
        if existing_member:
            failed_invites.append(f"{username} (already a member)")
            continue
            
        # Check if there's already a pending request
        existing_request = db.query(GroupPendingRequest).filter(
            GroupPendingRequest.group_id == group_id,
            GroupPendingRequest.invited_username == username,
            GroupPendingRequest.status == "pending"
        ).first()
        
        if existing_request:
            failed_invites.append(f"{username} (already invited)")
            continue
            
        # Create pending request
        pending_request = GroupPendingRequest(
            group_id=group_id,
            invited_username=username,
            invited_by=current_user.id,
            status="pending",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(pending_request)
        pending_requests.append(pending_request)
        successful_invites.append(username)
    
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
    
    message = f"Invitation process completed. {len(successful_invites)} invites sent"
    if failed_invites:
        message += f", {len(failed_invites)} failed"
        
    return GroupInviteResponse(
        message=message,
        successful_invites=successful_invites,
        failed_invites=failed_invites,
        pending_requests=pending_request_responses
    )

@router.post("/invites/{invite_id}/accept", response_model=GroupResponse)
async def accept_invite(
    invite_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a group invitation"""
    try:
        # Find the pending request
        pending_request = db.query(GroupPendingRequest).filter(
            GroupPendingRequest.id == invite_id,
            GroupPendingRequest.invited_username == current_user.username,
            GroupPendingRequest.status == "pending"
        ).first()
        
        if not pending_request:
            raise HTTPException(
                status_code=404,
                detail="Invitation not found or already processed"
            )
        
        # Check if expired
        if pending_request.expires_at and pending_request.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="Invitation has expired"
            )
        
        # Get the group to ensure it exists
        group = db.query(Group).filter(Group.id == pending_request.group_id).first()
        if not group:
            raise HTTPException(
                status_code=404,
                detail="Group not found"
            )
        
        # Check if user is already a member
        existing_member = db.query(GroupMember).filter(
            GroupMember.user_id == current_user.id,
            GroupMember.group_id == pending_request.group_id
        ).first()
        
        if existing_member:
            # Update the request status to accepted
            pending_request.status = "accepted"
            db.commit()
            return group
        
        # Add user to group
        db_member = GroupMember(
            user_id=current_user.id,
            group_id=pending_request.group_id,
            role="member"
        )
        db.add(db_member)
        
        # Update the request status
        pending_request.status = "accepted"
        
        # Commit all changes in a single transaction
        db.commit()
        
        return group
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Rollback on any other error
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to accept invitation: {str(e)}"
        )

@router.post("/invites/{invite_id}/decline")
async def decline_invite(
    invite_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Decline a group invitation"""
    try:
        # Find the pending request
        pending_request = db.query(GroupPendingRequest).filter(
            GroupPendingRequest.id == invite_id,
            GroupPendingRequest.invited_username == current_user.username,
            GroupPendingRequest.status == "pending"
        ).first()
        
        if not pending_request:
            raise HTTPException(
                status_code=404,
                detail="Invitation not found or already processed"
            )
        
        # Update the request status
        pending_request.status = "declined"
        db.commit()
        
        return {"message": "Invitation declined"}
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Rollback on any other error
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to decline invitation: {str(e)}"
        )
@router.put("/{group_id}/settings", response_model=GroupUpdateResponse)
async def update_group_settings(
    group_id: int,
    updates: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update group name and description (admin only)"""
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
    
    # Check if user is admin
    if membership.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only group admins can update settings"
        )
    
    # Get the group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )
    
    # Update group fields
    if updates.name is not None:
        group.name = updates.name
    if updates.description is not None:
        group.description = updates.description
    
    db.commit()
    db.refresh(group)
    
    return GroupUpdateResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        message="Group settings updated successfully"
    )

@router.put("/{group_id}/prompt", response_model=PromptUpdateResponse)
async def update_group_prompt(
    group_id: int,
    prompt_update: PromptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current active prompt for a group (admin only)"""
    print(f"DEBUG: update_group_prompt called for group {group_id} by user {current_user.id}")
    print(f"DEBUG: prompt_update: {prompt_update}")
    
    # Check if user is a member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id
    ).first()
    
    if not membership:
        print(f"DEBUG: User {current_user.id} is not a member of group {group_id}")
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )
    
    print(f"DEBUG: User {current_user.id} is a member of group {group_id} with role: {membership.role}")
    
    # Check if user is admin
    if membership.role != "admin":
        print(f"DEBUG: User {current_user.id} is not an admin (role: {membership.role})")
        raise HTTPException(
            status_code=403,
            detail="Only group admins can update prompts"
        )
    
    # Get the group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        print(f"DEBUG: Group {group_id} not found")
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )
    
    print(f"DEBUG: Found group {group_id}: {group.name}")
    
    # Deactivate current active prompt
    current_prompt = db.query(Prompt).filter(
        Prompt.group_id == group_id,
        Prompt.is_active == True
    ).first()
    
    if current_prompt:
        print(f"DEBUG: Deactivating current prompt {current_prompt.id}")
        current_prompt.is_active = False
        db.commit()
    else:
        print(f"DEBUG: No current active prompt found for group {group_id}")
    
    # Create new prompt
    print(f"DEBUG: Creating new prompt with text: {prompt_update.text}")
    new_prompt = Prompt(
        text=prompt_update.text,
        group_id=group_id,
        week_start=prompt_update.week_start or datetime.utcnow(),
        week_end=prompt_update.week_end or (datetime.utcnow() + timedelta(days=7)),
        is_active=True
    )
    
    db.add(new_prompt)
    db.commit()
    db.refresh(new_prompt)
    
    print(f"DEBUG: Created new prompt {new_prompt.id} for group {group_id}")
    
    return PromptUpdateResponse(
        id=new_prompt.id,
        text=new_prompt.text,
        group_id=group_id,
        message="Group prompt updated successfully"
    )
