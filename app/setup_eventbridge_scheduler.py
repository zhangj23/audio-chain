"""
AWS EventBridge setup for Weave video compilation scheduler
Creates EventBridge rules to trigger Lambda function weekly
"""

import boto3
import json
import os
from datetime import datetime

def create_eventbridge_rule():
    """
    Create EventBridge rule for weekly video compilation
    """
    # Initialize EventBridge client
    region = os.getenv('AWS_REGION', 'us-east-1')
    eventbridge_client = boto3.client('events', region_name=region)
    
    # Rule name and description
    rule_name = 'weave-weekly-video-compilation'
    rule_description = 'Weekly video compilation for Weave app - runs every Sunday at midnight UTC'
    
    try:
        # Create the rule
        response = eventbridge_client.put_rule(
            Name=rule_name,
            Description=rule_description,
            ScheduleExpression='cron(0 0 ? * SUN *)',  # Every Sunday at midnight UTC
            State='ENABLED'
        )
        
        print(f"✅ EventBridge rule created: {rule_name}")
        print(f"Rule ARN: {response['RuleArn']}")
        
        return rule_name, response['RuleArn']
        
    except Exception as e:
        print(f"❌ Error creating EventBridge rule: {e}")
        return None, None

def add_lambda_target(rule_name, lambda_function_name):
    """
    Add Lambda function as target for the EventBridge rule
    """
    # Initialize clients
    region = os.getenv('AWS_REGION', 'us-east-1')
    eventbridge_client = boto3.client('events', region_name=region)
    lambda_client = boto3.client('lambda', region_name=region)
    
    try:
        # Get Lambda function ARN
        lambda_response = lambda_client.get_function(FunctionName=lambda_function_name)
        lambda_arn = lambda_response['Configuration']['FunctionArn']
        
        # Create target
        target = {
            'Id': '1',
            'Arn': lambda_arn,
            'Input': json.dumps({
                'source': 'weekly_scheduler',
                'week_start': 'auto',
                'week_end': 'auto'
            })
        }
        
        # Add target to rule
        response = eventbridge_client.put_targets(
            Rule=rule_name,
            Targets=[target]
        )
        
        if response['FailedEntryCount'] == 0:
            print(f"✅ Lambda target added to rule: {rule_name}")
            print(f"Target ARN: {lambda_arn}")
        else:
            print(f"❌ Failed to add targets: {response['FailedEntries']}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error adding Lambda target: {e}")
        return False

def add_lambda_permission(rule_name, lambda_function_name):
    """
    Add permission for EventBridge to invoke Lambda function
    """
    region = os.getenv('AWS_REGION', 'us-east-1')
    lambda_client = boto3.client('lambda', region_name=region)
    
    try:
        # Get account ID from Lambda function ARN
        lambda_response = lambda_client.get_function(FunctionName=lambda_function_name)
        lambda_arn = lambda_response['Configuration']['FunctionArn']
        account_id = lambda_arn.split(':')[4]
        
        # Create permission
        response = lambda_client.add_permission(
            FunctionName=lambda_function_name,
            StatementId=f'allow-eventbridge-{rule_name}',
            Action='lambda:InvokeFunction',
            Principal='events.amazonaws.com',
            SourceArn=f'arn:aws:events:{boto3.Session().region_name}:{account_id}:rule/{rule_name}'
        )
        
        print(f"✅ Lambda permission added for EventBridge")
        return True
        
    except Exception as e:
        print(f"❌ Error adding Lambda permission: {e}")
        return False

def test_rule(rule_name):
    """
    Test the EventBridge rule by triggering it manually
    """
    region = os.getenv('AWS_REGION', 'us-east-1')
    eventbridge_client = boto3.client('events', region_name=region)
    
    try:
        # Test event
        test_event = {
            'source': 'manual_test',
            'week_start': 'auto',
            'week_end': 'auto'
        }
        
        # Send test event
        response = eventbridge_client.put_events(
            Entries=[{
                'Source': 'weave.manual.test',
                'DetailType': 'Manual Test',
                'Detail': json.dumps(test_event)
            }]
        )
        
        print(f"✅ Test event sent: {response['Entries'][0]['EventId']}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending test event: {e}")
        return False

def create_manual_trigger_rule():
    """
    Create a manual trigger rule for testing
    """
    region = os.getenv('AWS_REGION', 'us-east-1')
    eventbridge_client = boto3.client('events', region_name=region)
    
    try:
        # Create manual trigger rule
        response = eventbridge_client.put_rule(
            Name='weave-manual-video-compilation',
            Description='Manual trigger for Weave video compilation',
            State='ENABLED'
        )
        
        print(f"✅ Manual trigger rule created: weave-manual-video-compilation")
        return True
        
    except Exception as e:
        print(f"❌ Error creating manual trigger rule: {e}")
        return False

def main():
    """
    Main setup function for EventBridge scheduler
    """
    print("☁️ Setting up AWS EventBridge Scheduler for Weave")
    print("=" * 60)
    
    # Configuration
    lambda_function_name = 'weave-video-processor'
    
    try:
        # Create weekly rule
        print("📅 Creating weekly compilation rule...")
        rule_name, rule_arn = create_eventbridge_rule()
        
        if not rule_name:
            print("❌ Failed to create EventBridge rule")
            return
        
        # Add Lambda target
        print("🎯 Adding Lambda function as target...")
        if not add_lambda_target(rule_name, lambda_function_name):
            print("❌ Failed to add Lambda target")
            return
        
        # Add Lambda permission
        print("🔐 Adding Lambda permission...")
        if not add_lambda_permission(rule_name, lambda_function_name):
            print("❌ Failed to add Lambda permission")
            return
        
        # Create manual trigger rule
        print("🧪 Creating manual trigger rule...")
        create_manual_trigger_rule()
        
        print("\n✅ EventBridge scheduler setup completed!")
        print(f"📅 Weekly rule: {rule_name}")
        print(f"🧪 Manual rule: weave-manual-video-compilation")
        
        print("\n📋 Next steps:")
        print("1. Test the manual trigger rule")
        print("2. Monitor Lambda function logs")
        print("3. Verify weekly execution on Sunday")
        
        # Test the rule
        test_choice = input("\n🧪 Test the rule now? (y/n): ").lower().strip()
        if test_choice == 'y':
            test_rule(rule_name)
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")

if __name__ == "__main__":
    main()
