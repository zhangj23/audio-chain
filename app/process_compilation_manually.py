#!/usr/bin/env python3
"""
Manually process stuck compilations as a temporary solution
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import DATABASE_URL

# Load environment variables
load_dotenv()

def process_stuck_compilations():
    """Manually process stuck compilations"""
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
            # Find stuck compilations
            result = db.execute(text("""
                SELECT id, group_id, status, created_at
                FROM weekly_compilations 
                WHERE status = 'processing' AND s3_key IS NULL
                ORDER BY created_at DESC
            """))
            
            stuck_compilations = result.fetchall()
            
            if not stuck_compilations:
                print("✅ No stuck compilations found")
                return
            
            print(f"🔧 Found {len(stuck_compilations)} stuck compilations")
            
            for comp in stuck_compilations:
                print(f"\n📝 Processing compilation {comp.id} (Group {comp.group_id})")
                
                # For now, just mark as failed since we can't actually process videos locally
                # In a real scenario, you'd need FFmpeg and video processing capabilities
                db.execute(text("""
                    UPDATE weekly_compilations 
                    SET status = 'failed', 
                        completed_at = NOW()
                    WHERE id = :compilation_id
                """), {"compilation_id": comp.id})
                
                print(f"❌ Marked compilation {comp.id} as failed (Lambda function not accessible)")
            
            db.commit()
            print(f"\n✅ Updated {len(stuck_compilations)} compilations")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error processing compilations: {e}")
        raise

if __name__ == "__main__":
    process_stuck_compilations()
