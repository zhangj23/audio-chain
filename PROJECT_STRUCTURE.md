# Weave Project Structure

## 📁 Clean Project Structure

After cleanup, here's your organized project structure:

```
weave/
├── 📱 client/                    # React Native frontend
│   ├── app/                      # App screens and navigation
│   ├── components/               # Reusable UI components
│   ├── assets/                   # Images and icons
│   └── package.json              # Frontend dependencies
│
├── 🚀 app/                       # FastAPI backend
│   ├── routers/                  # API endpoints
│   │   ├── auth.py              # Authentication routes
│   │   ├── groups.py            # Group management
│   │   ├── prompts.py           # Prompt system
│   │   └── videos.py            # Video upload & compilation
│   ├── models/                   # Database models
│   ├── schemas/                  # Pydantic schemas
│   ├── main.py                   # FastAPI app entry point
│   ├── database.py              # Database configuration
│   ├── auth.py                  # JWT authentication
│   ├── scheduler.py             # Weekly compilation scheduler
│   └── setup_eventbridge_scheduler.py  # AWS EventBridge setup
│
├── ☁️ AWS Lambda/                # Serverless video processing
│   └── lambda_video_processor_updated.py  # Main Lambda function
│
├── 📚 Documentation/
│   ├── AWS_EVENTBRIDGE_SETUP.md  # EventBridge configuration
│   ├── VIDEO_COMPILATION_SETUP.md # Complete setup guide
│   └── PROJECT_STRUCTURE.md      # This file
│
└── 🗄️ Database/
    ├── weave.db                  # SQLite database (development)
    └── audiochain.db            # Legacy database
```

## 🎯 Key Files

### **Backend API**

- `app/main.py` - FastAPI application
- `app/routers/videos.py` - Video compilation endpoints
- `app/scheduler.py` - Weekly compilation logic

### **AWS Integration**

- `lambda_video_processor_updated.py` - Lambda function for video processing
- `app/setup_eventbridge_scheduler.py` - EventBridge setup script

### **Documentation**

- `VIDEO_COMPILATION_SETUP.md` - Complete setup guide
- `AWS_EVENTBRIDGE_SETUP.md` - EventBridge configuration

## 🧹 Cleaned Up Files

**Removed unused files:**

- ❌ Local scheduler scripts (Windows/Linux)
- ❌ Old Lambda function versions
- ❌ FFmpeg layer build scripts
- ❌ Deployment packages
- ❌ Legacy setup guides

## 🚀 Current Workflow

1. **Frontend** → React Native app for video recording
2. **Backend** → FastAPI for API endpoints
3. **Database** → SQLite (dev) / PostgreSQL (prod)
4. **Storage** → AWS S3 for video files
5. **Processing** → AWS Lambda for video compilation
6. **Scheduling** → AWS EventBridge for weekly triggers

## 📋 Next Steps

1. **Set up EventBridge** using `AWS_EVENTBRIDGE_SETUP.md`
2. **Deploy Lambda function** with `lambda_video_processor_updated.py`
3. **Test the complete workflow**
4. **Set up monitoring and alerts**

Your project is now clean and organized! 🎉
