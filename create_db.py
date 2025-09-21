#!/usr/bin/env python3
"""
Create database tables for the Weave backend using production database
"""

import os
from dotenv import load_dotenv
from app.database import engine, Base
from app.models import user, group, video, prompt

# Load environment variables
load_dotenv()

def create_tables():
    """Create all database tables in the production database"""
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found in environment variables!")
            print("Please create a .env file with your production database URL")
            return
        
        print(f"🔗 Connecting to database: {database_url.split('@')[1] if '@' in database_url else 'local'}")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database tables created successfully!")
        print("📊 Tables created:")
        print("   - users")
        print("   - groups") 
        print("   - group_members")
        print("   - group_pending_requests")
        print("   - video_submissions")
        print("   - weekly_compilations")
        print("   - prompts")
        print("\n🚀 Your production database is ready!")
        
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")
        print("\n🔍 Troubleshooting:")
        print("1. Check if your DATABASE_URL is correct in .env file")
        print("2. Ensure the database server is accessible")
        print("3. Verify your database credentials")
        raise

if __name__ == "__main__":
    create_tables()
