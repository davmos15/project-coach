# Quick Setup Guide

## 🚀 Get Started in 15 Minutes

This guide will get Project Coach up and running quickly.

### 1. Clone & Install
```bash
git clone https://github.com/your-username/project-coach.git
cd project-coach
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your credentials (see below)
```

### 3. Google Cloud Setup (5 minutes)

**Enable APIs:**
- Go to [Google Cloud Console](https://console.cloud.google.com/apis/library)
- Enable: Calendar API, Tasks API, Drive API

**Create OAuth Credentials:**
- Go to APIs & Services > Credentials
- Create OAuth 2.0 Client ID (Web application)  
- Add redirect URI: `https://your-domain.com/auth/callback`
- Copy Client ID and Secret to .env

### 4. SendGrid Setup (2 minutes)
- Sign up at [sendgrid.com](https://sendgrid.com)
- Create API key with Mail Send permissions
- Add to .env as `SENDGRID_API_KEY`

### 5. AWS Setup (3 minutes)
```bash
# Install AWS CLI and configure
aws configure
# Enter your access keys and region

# Install Serverless globally  
npm install -g serverless
```

### 6. Deploy (2 minutes)
```bash
# Validate setup
npm test
npm run lint

# Deploy to AWS
npm run deploy:prod
```

### 7. Test (1 minute)
- Visit your deployed URL
- Complete Google OAuth
- Check that "AI Coach" calendar was created
- Add a task in Google Tasks
- Check your email for welcome message

## 🔧 .env Configuration

**Required Variables:**
```bash
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-24-char-secret  
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback
BASE_URL=https://your-domain.com
EMAIL_FROM=noreply@yourdomain.com
SENDGRID_API_KEY=SG.your-sendgrid-key
```

## 🎯 Next Steps

After deployment:
1. **Test the onboarding flow** - visit your URL and sign in
2. **Add test tasks** - create tasks in Google Tasks  
3. **Wait for scheduling** - runs nightly at 4 AM
4. **Check your calendar** - should see "AI Coach" calendar
5. **Customize config** - edit `coach_config.yaml` in Google Drive

## 🆘 Common Issues

**OAuth Error**: Check redirect URI matches exactly  
**Deploy Failed**: Verify AWS credentials and permissions
**No Email**: Check SendGrid API key and sender verification
**Calendar Missing**: Ensure Calendar API is enabled

## 📚 Full Documentation
- [Complete Deployment Guide](DEPLOYMENT.md)
- [Architecture Overview](README.md)
- [Contributing](CONTRIBUTING.md)

Need help? Open an issue or check the troubleshooting section in DEPLOYMENT.md.