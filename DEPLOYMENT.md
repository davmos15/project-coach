# Deployment Guide - Project Coach v5.0

This comprehensive guide walks you through setting up and deploying Project Coach to AWS Lambda using the Serverless Framework.

## 🚀 Quick Start

### Prerequisites Checklist
- [ ] AWS Account with appropriate IAM permissions
- [ ] Google Cloud Project with APIs enabled  
- [ ] SendGrid Account for email services
- [ ] Domain name (optional but recommended)
- [ ] Node.js 18+ installed locally
- [ ] Git installed

## Step 1: AWS Setup

### Install AWS CLI
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and Region
```

### Create IAM User (if needed)
Create an IAM user with the following permissions:
- AWSLambdaFullAccess
- AmazonAPIGatewayAdministrator
- CloudFormationFullAccess
- AmazonS3FullAccess
- CloudWatchLogsFullAccess
- IAMFullAccess

## Step 2: Google Cloud Setup

### Enable Required APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable these APIs:
   - Google Calendar API
   - Google Tasks API
   - Google Drive API

### Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URIs:
   ```
   http://localhost:3000/auth/callback  (for development)
   https://your-domain.com/auth/callback  (for production)
   ```
5. Save the Client ID and Client Secret

## Step 3: SendGrid Setup

### Create SendGrid Account
1. Sign up at [SendGrid](https://sendgrid.com)
2. Verify your sender identity
3. Create an API key with Mail Send permissions

## Step 4: Clone and Setup Repository

### Clone the Repository
```bash
git clone https://github.com/your-username/project-coach.git
cd project-coach
npm install
```

### Environment Configuration

**Create .env file**
```bash
cp .env.example .env
```

**Fill in your credentials**
```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback

# Application Configuration
NODE_ENV=production
PORT=3000
BASE_URL=https://your-domain.com

# Email Configuration
EMAIL_FROM=noreply@your-domain.com
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# Serverless Configuration
AWS_REGION=us-east-1
STAGE=prod
```

## Step 5: Validate Setup

### Install Global Dependencies
```bash
npm install -g serverless
```

### Validate Configuration
```bash
# Check environment setup
npm run audit

# Run tests to ensure everything works
npm test

# Check code formatting
npm run lint
```

## Step 6: Deploy to AWS

### Deploy all functions
```bash
serverless deploy --stage prod
```

### Deploy specific function (for updates)
```bash
serverless deploy function -f nightlyScheduler --stage prod
```

### Expected output
```
✅ Service deployed to stack project-coach-prod
✅ endpoints:
  ANY - https://abc123.execute-api.us-east-1.amazonaws.com/prod
  ANY - https://abc123.execute-api.us-east-1.amazonaws.com/prod/{proxy+}
  GET - https://abc123.execute-api.us-east-1.amazonaws.com/prod/auth/callback
  POST - https://abc123.execute-api.us-east-1.amazonaws.com/prod/webhook/calendar
```

## Step 7: Configure Custom Domain (Optional)

### Using AWS Certificate Manager
1. Request SSL certificate for your domain
2. Add custom domain in API Gateway
3. Update your DNS records

### Update Google OAuth
Update your Google OAuth redirect URI to use your custom domain:
```
https://your-domain.com/auth/callback
```

## Step 8: Test Deployment

### Health Check
```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-08-28T12:00:00.000Z",
  "version": "5.0.0",
  "environment": "production"
}
```

### Test Authentication Flow
1. Visit your deployed URL
2. Click "Continue with Google"
3. Complete OAuth flow
4. Verify calendar and config file creation

## Step 9: Monitoring Setup

### CloudWatch Logs
- View function logs in AWS CloudWatch
- Set up log retention policies
- Create custom metrics

### Error Tracking
```bash
# View recent errors
aws logs filter-log-events --log-group-name /aws/lambda/project-coach-prod-app
```

### Set up Alarms
Create CloudWatch alarms for:
- Function errors
- Function duration
- Invocation count

## Step 10: Production Checklist

### Security
- [ ] Environment variables configured
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled (API Gateway)

### Functionality
- [ ] OAuth flow works
- [ ] Calendar creation successful
- [ ] Webhook endpoints responding
- [ ] Email notifications sending
- [ ] Nightly scheduler running

### Monitoring
- [ ] CloudWatch logs accessible
- [ ] Error tracking configured
- [ ] Performance metrics monitored
- [ ] Health check endpoint working

## Troubleshooting

### Common Deployment Issues

**Serverless deployment fails**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify IAM permissions
aws iam get-user
```

**Function timeout errors**
- Increase timeout in serverless.yml
- Optimize function performance
- Check external API response times

**Environment variables not loading**
```bash
# Verify variables in AWS Console
aws lambda get-function-configuration --function-name project-coach-prod-app
```

### Google API Issues

**OAuth redirect mismatch**
- Verify redirect URIs match exactly
- Check for http vs https
- Ensure no trailing slashes

**API quota exceeded**
- Check Google Cloud Console quotas
- Request quota increases if needed
- Implement exponential backoff

### Email Delivery Issues

**SendGrid authentication**
```bash
# Test API key
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
-H "Authorization: Bearer YOUR_API_KEY" \
-H "Content-Type: application/json"
```

**Email not delivered**
- Check SendGrid sender verification
- Review email content for spam triggers
- Verify recipient email addresses

## Scaling Considerations

### Performance Optimization
- Enable Lambda provisioned concurrency for frequently used functions
- Optimize memory allocation based on usage patterns
- Implement connection pooling for external APIs

### Cost Optimization
- Monitor Lambda invocation costs
- Set up billing alerts
- Consider reserved capacity for predictable workloads

### Multi-User Support
- Implement user data isolation
- Add user management system
- Scale database storage appropriately

## Backup and Recovery

### Configuration Backup
```bash
# Export serverless configuration
serverless print --stage prod > deployment-config-backup.yml
```

### Data Backup
- User data remains in their Google accounts
- Backup learning data periodically
- Document configuration settings

### Disaster Recovery
- Maintain infrastructure as code
- Document deployment procedures
- Test recovery procedures regularly

## Updates and Maintenance

### Rolling Updates
```bash
# Deploy with zero downtime
serverless deploy --stage prod
```

### Database Migrations
- Plan schema changes carefully
- Test migrations in staging
- Backup data before major changes

### Dependency Updates
```bash
# Check for security updates
npm audit

# Update dependencies
npm update
```

---

## Support

If you encounter issues during deployment:

1. Check the troubleshooting section above
2. Review AWS CloudWatch logs
3. Verify all environment variables
4. Test individual components

For additional help:
- 📚 [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- 🔧 [Serverless Framework Docs](https://www.serverless.com/framework/docs/)
- 🤝 [Project Issues](https://github.com/your-repo/issues)