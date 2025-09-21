#!/usr/bin/env python3
"""
Create a default active prompt in the database
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.prompt import Prompt

# Load environment variables
load_dotenv()

def create_default_prompt():
    """Create a default active prompt in the database"""
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found in environment variables!")
            return
        
        print(f"🔗 Connecting to database...")
        
        # Create database connection
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Check if there's already an active prompt
        existing_prompt = db.query(Prompt).filter(Prompt.is_active == True).first()
        
        if existing_prompt:
            print(f"✅ Active prompt already exists: '{existing_prompt.text}' (ID: {existing_prompt.id})")
            return
        
        # Create a default prompt for the current week
        now = datetime.now()
        week_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)
        
        default_prompt = Prompt(
            text="Show us what you're up to this week!",
            week_start=week_start,
            week_end=week_end,
            is_active=True
        )
        
        db.add(default_prompt)
        db.commit()
        db.refresh(default_prompt)
        
        print("✅ Default prompt created successfully!")
        print(f"📝 Prompt: '{default_prompt.text}'")
        print(f"🆔 ID: {default_prompt.id}")
        print(f"📅 Week: {week_start.strftime('%Y-%m-%d')} to {week_end.strftime('%Y-%m-%d')}")
        print(f"✅ Active: {default_prompt.is_active}")
        
    except Exception as e:
        print(f"❌ Error creating default prompt: {e}")
        raise
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    create_default_prompt()
