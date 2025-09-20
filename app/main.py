from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import uvicorn

from app.database import get_db, engine, Base
from app.routers import auth, groups, videos, prompts
from app.models import user, group, video, prompt

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Weave API",
    description="Social app for creating weekly video compilations from friend groups",
    version="1.0.0"
)

# CORS middleware for React Native app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(videos.router, prefix="/videos", tags=["videos"])
app.include_router(prompts.router, prefix="/prompts", tags=["prompts"])

@app.get("/")
async def root():
    return {"message": "Weave API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
