# Weave Video Compilation Integration Guide

This guide explains how to set up the video compilation functionality in your Weave app.

## 🎯 Features Added

### 1. Manual Video Compilation

- **Endpoint**: `POST /videos/generate-compilation/{group_id}`
- **Purpose**: Allow users to manually trigger video compilation for their group
- **Response**: Returns compilation ID and processing status

### 2. Automatic Weekly Compilation

- **Schedule**: Every Sunday at midnight
- **Purpose**: Automatically generate compilations for all active groups
- **Setup**: Cron job or systemd timer

### 3. Compilation Status Tracking

- **Endpoint**: `GET /videos/compilation-status/{compilation_id}`
- **Purpose**: Check the status of video compilations
- **Response**: Status, download URL (when completed)

## 🔧 Setup Instructions

### 1. Update Lambda Function

Replace your current Lambda function code with `lambda_video_processor_updated.py`:

```bash
# Upload the updated Lambda function
python deploy_lambda_simple.py
```

### 2. Set Environment Variables

In your Lambda function, add these environment variables:

```bash
DATABASE_URL=postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/weave
S3_BUCKET=weave-videos
```

### 3. Set up Weekly Scheduler

Run the scheduler setup:

```bash
cd app
python setup_scheduler.py
```

This creates:

- `run_scheduler.sh` - Shell script for cron
- `SCHEDULER_SETUP.md` - Detailed setup instructions

### 4. Configure Cron Job

Add to your crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at midnight):
0 0 * * 0 /path/to/app/run_scheduler.sh >> /var/log/weave_scheduler.log 2>&1
```

## 📡 API Endpoints

### Manual Compilation

```bash
# Trigger manual compilation
curl -X POST "http://localhost:8000/videos/generate-compilation/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "message": "Video compilation started",
  "compilation_id": 123,
  "status": "processing",
  "estimated_completion": "5-10 minutes"
}
```

### Check Compilation Status

```bash
# Check compilation status
curl -X GET "http://localhost:8000/videos/compilation-status/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "id": 123,
  "group_id": 1,
  "week_start": "2024-01-15",
  "week_end": "2024-01-21",
  "status": "completed",
  "created_at": "2024-01-20T00:00:00",
  "completed_at": "2024-01-20T00:05:00",
  "download_url": "https://s3.amazonaws.com/weave-videos/compilations/1/20240115_compilation.mp4?signature=..."
}
```

### Test Endpoint

```bash
# Test compilation (no Lambda required)
curl -X POST "http://localhost:8000/videos/test-compilation/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔄 Workflow

### Manual Compilation Flow

1. **User triggers compilation** → `POST /videos/generate-compilation/{group_id}`
2. **Backend creates compilation record** → Status: "processing"
3. **Backend invokes Lambda** → Asynchronous processing
4. **Lambda processes videos** → Downloads, concatenates, uploads
5. **Lambda updates database** → Status: "completed"
6. **User checks status** → `GET /videos/compilation-status/{compilation_id}`
7. **User downloads video** → Presigned URL provided

### Automatic Weekly Flow

1. **Cron triggers scheduler** → Every Sunday at midnight
2. **Scheduler finds active groups** → Database query
3. **Scheduler processes each group** → Creates compilation records
4. **Scheduler invokes Lambda** → For each group with videos
5. **Lambda processes videos** → Same as manual flow
6. **Users get notifications** → When compilations are ready

## 🧪 Testing

### 1. Test Manual Compilation

```bash
# Start your FastAPI server
cd app
python -m uvicorn main:app --reload

# Test the endpoint
curl -X POST "http://localhost:8000/videos/test-compilation/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Lambda Function

```bash
# Test Lambda with sample event
aws lambda invoke \
  --function-name weave-video-processor \
  --payload '{"source":"manual_trigger","group_id":1,"compilation_id":123}' \
  response.json

cat response.json
```

### 3. Test Scheduler

```bash
# Run scheduler manually
cd app
python -m scheduler
```

## 📊 Monitoring

### 1. Lambda Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/weave-video-processor --follow
```

### 2. Scheduler Logs

```bash
# View scheduler logs
tail -f /var/log/weave_scheduler.log
```

### 3. Database Status

```sql
-- Check compilation status
SELECT * FROM weekly_compilations ORDER BY created_at DESC;

-- Check video submissions
SELECT group_id, COUNT(*) as video_count
FROM video_submissions
GROUP BY group_id;
```

## 🚨 Troubleshooting

### Common Issues

1. **Lambda timeout**: Increase timeout to 15 minutes
2. **FFmpeg not found**: Ensure FFmpeg layer is attached
3. **Database connection**: Check DATABASE_URL environment variable
4. **S3 permissions**: Ensure Lambda has S3 read/write access
5. **Cron not running**: Check cron service and logs

### Debug Commands

```bash
# Check Lambda function status
aws lambda get-function --function-name weave-video-processor

# Check cron jobs
crontab -l

# Check scheduler script permissions
ls -la app/run_scheduler.sh

# Test database connection
python -c "import psycopg2; print(psycopg2.connect('$DATABASE_URL'))"
```

## 📈 Next Steps

1. **Set up monitoring** → CloudWatch alarms for failures
2. **Add notifications** → Email/SMS when compilations are ready
3. **Optimize performance** → Parallel processing for multiple groups
4. **Add features** → Background music, transitions, custom intro/outro
5. **Scale up** → Multiple Lambda functions for high volume

## 🔗 Related Files

- `app/routers/videos.py` - API endpoints
- `app/scheduler.py` - Weekly scheduler
- `app/setup_scheduler.py` - Scheduler setup
- `lambda_video_processor_updated.py` - Lambda function
- `deploy_lambda_simple.py` - Lambda deployment
