#!/usr/bin/env python3
"""
Migration script to add group_id column to prompts table
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import DATABASE_URL

def migrate_prompts_add_group_id():
    """Add group_id column to prompts table"""
    print("Starting migration: Add group_id to prompts table")
    
    # Create database connection
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Check if group_id column already exists
        result = session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'prompts' AND column_name = 'group_id'
        """))
        
        if result.fetchone():
            print("group_id column already exists in prompts table")
            return
        
        # Add group_id column with a default value
        print("Adding group_id column to prompts table...")
        session.execute(text("""
            ALTER TABLE prompts 
            ADD COLUMN group_id INTEGER
        """))
        
        # Set a default group_id for existing prompts (use group 1 as default)
        print("Setting default group_id for existing prompts...")
        session.execute(text("""
            UPDATE prompts 
            SET group_id = 1 
            WHERE group_id IS NULL
        """))
        
        # Make the column NOT NULL
        print("Making group_id column NOT NULL...")
        session.execute(text("""
            ALTER TABLE prompts 
            ALTER COLUMN group_id SET NOT NULL
        """))
        
        # Add foreign key constraint
        print("Adding foreign key constraint...")
        session.execute(text("""
            ALTER TABLE prompts 
            ADD CONSTRAINT fk_prompts_group_id 
            FOREIGN KEY (group_id) REFERENCES groups(id)
        """))
        
        session.commit()
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    migrate_prompts_add_group_id()
