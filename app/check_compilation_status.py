#!/usr/bin/env python3
"""
Check compilation status and debug why videos aren't appearing in S3
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import DATABASE_URL

# Load environment variables
load_dotenv()

def check_compilation_status():
    """Check compilation status and debug issues"""
    try:
        database_url = DATABASE_URL
        if not database_url:
            print("❌ DATABASE_URL not found in environment variables!")
            return

        print(f"🔗 Connecting to database...")
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Get all compilations
            result = db.execute(text("""
                SELECT id, group_id, status, s3_key, created_at, completed_at
                FROM weekly_compilations 
                ORDER BY created_at DESC
                LIMIT 10
            """))
            
            compilations = result.fetchall()
            
            if not compilations:
                print("📭 No compilations found in database")
                return
            
            print(f"📊 Found {len(compilations)} compilations:")
            print("=" * 80)
            
            for comp in compilations:
                print(f"🆔 ID: {comp.id}")
                print(f"👥 Group ID: {comp.group_id}")
                print(f"📊 Status: {comp.status}")
                print(f"🔗 S3 Key: {comp.s3_key or 'Not set'}")
                print(f"📅 Created: {comp.created_at}")
                print(f"✅ Completed: {comp.completed_at or 'Not completed'}")
                print("-" * 40)
            
            # Check for stuck compilations
            stuck_compilations = [c for c in compilations if c.status == "processing" and c.s3_key is None]
            if stuck_compilations:
                print(f"⚠️ Found {len(stuck_compilations)} stuck compilations (processing but no S3 key)")
                print("This suggests the Lambda function may not be working properly.")
                
                for comp in stuck_compilations:
                    print(f"  - Compilation {comp.id} (Group {comp.group_id}) stuck since {comp.created_at}")
            
            # Check for completed compilations
            completed_compilations = [c for c in compilations if c.status == "completed" and c.s3_key]
            if completed_compilations:
                print(f"✅ Found {len(completed_compilations)} completed compilations:")
                for comp in completed_compilations:
                    print(f"  - Compilation {comp.id}: {comp.s3_key}")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error checking compilation status: {e}")
        print("\n🔍 Troubleshooting:")
        print("1. Check if your DATABASE_URL is correct")
        print("2. Ensure the database server is accessible")
        print("3. Verify your database credentials")
        raise

if __name__ == "__main__":
    check_compilation_status()
