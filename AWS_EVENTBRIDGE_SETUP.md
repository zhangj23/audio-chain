# AWS EventBridge Scheduler Setup for Weave

This guide shows how to set up AWS EventBridge to automatically trigger video compilations every Sunday at midnight.

## 🎯 Why EventBridge Instead of Local Cron?

- **☁️ Cloud-native**: Runs in AWS, not dependent on local machine
- **🔄 Reliable**: AWS manages the scheduling, no local dependencies
- **📊 Monitoring**: Built-in CloudWatch logs and metrics
- **🔧 Scalable**: Can handle multiple regions and environments
- **💰 Cost-effective**: Pay only for what you use

## 🚀 Quick Setup

### 1. Run the EventBridge Setup Script

```bash
cd app
python setup_eventbridge_scheduler.py
```

This will:

- Create EventBridge rule for weekly execution
- Add Lambda function as target
- Set up proper permissions
- Create manual trigger for testing

### 2. Manual Setup (Alternative)

If you prefer to set it up manually:

#### Step 1: Create EventBridge Rule

```bash
aws events put-rule \
  --name weave-weekly-video-compilation \
  --description "Weekly video compilation for Weave app" \
   --schedule-expression "cron(0 0 ? * 7 *)" \
  --state ENABLED
```

#### Step 2: Add Lambda Target

```bash
aws events put-targets \
  --rule weave-weekly-video-compilation \
  --targets '[{
    "Id": "1",
    "Arn": "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:weave-video-processor",
    "Input": "{\"source\":\"weekly_scheduler\",\"week_start\":\"auto\",\"week_end\":\"auto\"}"
  }]'
```

#### Step 3: Add Lambda Permission

```bash
aws lambda add-permission \
  --function-name weave-video-processor \
  --statement-id allow-eventbridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT_ID:rule/weave-weekly-video-compilation
```

## 📅 Schedule Expressions

### Weekly (Every Sunday at Midnight UTC)

```
cron(0 0 ? * 7 *)
```

### Daily (Every Day at Midnight UTC)

```
cron(0 0 * * ? *)
```

### Custom Time (Every Sunday at 2 AM UTC)

```
cron(0 2 ? * 7 *)
```

### Time Zone Considerations

- EventBridge uses UTC by default
- For local time zones, adjust the hour accordingly
- Example: For EST (UTC-5), use `cron(0 5 ? * 7 *)` for midnight EST

## 🧪 Testing

### 1. Test Manual Trigger

```bash
aws events put-events \
  --entries '[{
    "Source": "weave.manual.test",
    "DetailType": "Manual Test",
    "Detail": "{\"source\":\"manual_test\",\"week_start\":\"auto\",\"week_end\":\"auto\"}"
  }]'
```

### 2. Test Lambda Function Directly

```bash
aws lambda invoke \
  --function-name weave-video-processor \
  --payload '{"source":"manual_test","week_start":"auto","week_end":"auto"}' \
  response.json
```

### 3. Monitor Execution

```bash
# View Lambda logs
aws logs tail /aws/lambda/weave-video-processor --follow

# View EventBridge logs
aws logs tail /aws/events/weave-weekly-video-compilation --follow
```

## 📊 Monitoring and Alerts

### 1. CloudWatch Metrics

Monitor these metrics:

- **Lambda Invocations**: Number of function calls
- **Lambda Errors**: Failed executions
- **Lambda Duration**: Execution time
- **EventBridge Rule Matches**: Successful rule triggers

### 2. Set Up Alerts

```bash
# Create CloudWatch alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name "WeaveVideoProcessorErrors" \
  --alarm-description "Alert when Lambda function fails" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1
```

### 3. Dashboard Setup

Create a CloudWatch dashboard with:

- Lambda function metrics
- EventBridge rule metrics
- Error rates and durations
- Success/failure trends

## 🔧 Troubleshooting

### Common Issues

1. **Rule not triggering**

   - Check rule state (ENABLED/DISABLED)
   - Verify schedule expression syntax
   - Check time zone settings

2. **Lambda not receiving events**

   - Verify Lambda permissions
   - Check EventBridge target configuration
   - Review Lambda function logs

3. **Permission errors**
   - Ensure EventBridge has Lambda invoke permission
   - Check IAM roles and policies
   - Verify function ARN is correct

### Debug Commands

```bash
# Check rule status
aws events describe-rule --name weave-weekly-video-compilation

# List targets
aws events list-targets-by-rule --rule weave-weekly-video-compilation

# Check Lambda permissions
aws lambda get-policy --function-name weave-video-processor

# View recent executions
aws logs filter-log-events \
  --log-group-name /aws/lambda/weave-video-processor \
  --start-time $(date -d '1 hour ago' +%s)000
```

## 🏗️ Architecture

```
EventBridge Rule (Weekly)
    ↓
Lambda Function (weave-video-processor)
    ↓
Database Query (Active Groups)
    ↓
S3 Video Processing
    ↓
Database Update (Compilation Status)
```

## 📈 Scaling Considerations

### 1. Multiple Regions

- Deploy EventBridge rules in each region
- Use cross-region Lambda replication
- Set up regional monitoring

### 2. High Volume

- Consider SQS for queuing
- Use Step Functions for complex workflows
- Implement retry logic and dead letter queues

### 3. Cost Optimization

- Use appropriate Lambda memory settings
- Optimize schedule expressions
- Monitor and adjust as needed

## 🔄 Migration from Local Cron

If you're migrating from local cron:

1. **Disable local cron jobs**
2. **Set up EventBridge rules**
3. **Test thoroughly**
4. **Monitor for a few weeks**
5. **Remove local scheduler**

## 📋 Best Practices

1. **Use descriptive rule names**
2. **Set up proper monitoring**
3. **Test in staging first**
4. **Use least privilege permissions**
5. **Document your setup**
6. **Regular health checks**

## 🎯 Next Steps

1. **Run the setup script**
2. **Test the manual trigger**
3. **Monitor the first weekly execution**
4. **Set up alerts and monitoring**
5. **Document your configuration**

## 🔗 Related AWS Services

- **EventBridge**: Event scheduling and routing
- **Lambda**: Serverless compute
- **CloudWatch**: Monitoring and logging
- **S3**: Video storage
- **RDS**: Database for metadata
- **IAM**: Permissions and access control
