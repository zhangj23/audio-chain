# Audio Chain Backend API

A FastAPI backend for the Audio Chain social app that creates weekly video compilations from friend groups.

## Features

- **User Management**: Registration, authentication, and profile management
- **Group Management**: Create and join friend groups with invite codes
- **Video Submission**: Upload and manage short video submissions
- **Weekly Compilations**: Automated video processing and compilation
- **Background Music**: Add royalty-free music to compilations
- **AWS Integration**: S3 storage and RDS PostgreSQL database

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `env.example` to `.env` and configure your environment variables:

```bash
cp env.example .env
```

Update the following variables in `.env`:

- `DATABASE_URL`: Your PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_BUCKET_NAME`: Your S3 bucket name

### 3. Database Setup

The application will automatically create tables on startup. Make sure your PostgreSQL database is running and accessible.

### 4. AWS S3 Setup

Ensure your S3 bucket exists and is accessible with the provided credentials.

### 5. Run the Application

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

### Groups

- `POST /groups/create` - Create a new group
- `POST /groups/join` - Join a group with invite code
- `GET /groups/my-groups` - Get user's groups
- `GET /groups/{group_id}` - Get group details

### Videos

- `POST /videos/upload` - Upload video submission
- `GET /videos/submissions/{group_id}` - Get group submissions
- `GET /videos/compilations/{group_id}` - Get weekly compilations
- `GET /videos/music-tracks` - Get available music tracks
- `GET /videos/download-url/{submission_id}` - Get download URL

### Prompts

- `GET /prompts/current` - Get current active prompt
- `GET /prompts/all` - Get all prompts

## Video Processing

The application includes video processing capabilities using FFmpeg:

- Video concatenation for weekly compilations
- Background music addition
- Automatic S3 upload and cleanup

## Dependencies

- **FastAPI**: Web framework
- **SQLAlchemy**: ORM
- **PostgreSQL**: Database
- **AWS S3**: File storage
- **FFmpeg**: Video processing
- **JWT**: Authentication

## Development

For development, the application includes:

- Auto-reload on code changes
- Comprehensive error handling
- CORS middleware for React Native
- Detailed API documentation
