# Audio Chain Lambda Video Processor Setup Guide

## Overview

This Lambda function processes weekly video submissions and creates compilations for each friend group.

## Features

- ✅ Downloads videos from S3
- ✅ Concatenates videos using FFmpeg
- ✅ Uploads final compilation to S3
- ✅ Saves compilation record to database
- ✅ Handles multiple groups simultaneously

## Setup Instructions

### 1. Create Lambda Function

```bash
# In AWS Console:
# 1. Go to Lambda → Functions → Create function
# 2. Choose "Author from scratch"
# 3. Function name: audio-chain-video-processor
# 4. Runtime: Python 3.9
# 5. Architecture: x86_64
```

### 2. Configure Function Settings

```bash
# Basic Settings:
# - Timeout: 15 minutes (900 seconds)
# - Memory: 1024 MB
# - Environment variables:
#   - DATABASE_URL: postgresql://username:password@host:port/database
#   - S3_BUCKET: your-bucket-name
#   - AWS_REGION: us-east-1
```

### 3. Add FFmpeg Layer

```bash
# Add FFmpeg layer for video processing:
# ARN: arn:aws:lambda:us-east-1:123456789012:layer:ffmpeg:1
# Or create your own FFmpeg layer
```

### 4. Deploy Code

```bash
# Run deployment script
python deploy_lambda.py
```

### 5. Set Up EventBridge Trigger

```bash
# Create EventBridge rule for weekly execution:
# - Schedule: cron(0 0 ? * SUN *)  # Every Sunday at midnight
# - Target: Lambda function
# - Input: {"source": "weekly_compilation"}
```

## Environment Variables

| Variable       | Description                  | Example                               |
| -------------- | ---------------------------- | ------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `S3_BUCKET`    | S3 bucket for video storage  | `audio-chain-videos`                  |
| `AWS_REGION`   | AWS region                   | `us-east-1`                           |

## IAM Permissions

The Lambda execution role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::your-bucket-name"
    },
    {
      "Effect": "Allow",
      "Action": ["rds:DescribeDBInstances"],
      "Resource": "*"
    }
  ]
}
```

## Testing

### Manual Test

```python
# Test event
{
    "source": "manual_test"
}
```

### Weekly Schedule

```python
# EventBridge event
{
    "source": "aws.events",
    "detail-type": "Scheduled Event"
}
```

## Monitoring

### CloudWatch Logs

- View logs in CloudWatch Logs group: `/aws/lambda/audio-chain-video-processor`
- Monitor execution time and memory usage

### Metrics to Watch

- Duration (should be < 15 minutes)
- Error rate (should be 0%)
- Memory utilization
- Throttles

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: Add FFmpeg layer
2. **Database connection timeout**: Check VPC configuration
3. **S3 access denied**: Check IAM permissions
4. **Memory limit exceeded**: Increase memory allocation

### Debug Steps

1. Check CloudWatch logs
2. Test database connectivity
3. Verify S3 permissions
4. Test FFmpeg installation

## Cost Optimization

- **Memory**: Start with 1024 MB, adjust based on usage
- **Timeout**: Set to 15 minutes (max for Lambda)
- **Frequency**: Weekly execution (low cost)
- **Storage**: Use S3 lifecycle policies for old videos

## Security Considerations

- Use VPC for database access
- Encrypt environment variables
- Rotate database credentials regularly
- Monitor for unusual activity
