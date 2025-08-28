# Project Coach v5.0 - AI Productivity Assistant

An invisible, proactive AI productivity coach that seamlessly integrates with Google Calendar to automate task scheduling, learn from your behavior, and provide data-driven insights for continuous productivity improvement.

## 🌟 Features

- **Invisible Integration**: Works entirely within your existing Google Calendar workflow
- **Intelligent Scheduling**: Automatically schedules tasks, projects, and habits based on your availability
- **Learning System**: Adapts to your working patterns and improves time estimates over time
- **Opportunity Scheduling**: Proactively fills gaps when you complete tasks early
- **Daily Insights**: Provides comprehensive daily productivity summaries via email
- **Zero UI**: No additional apps to manage - everything happens in Google Calendar

## 🏗️ Architecture

### Core Components

- **100% Serverless**: Built on AWS Lambda/Google Cloud Functions
- **Event-Driven**: Uses Google Calendar webhooks for real-time responses
- **Cloud-Native**: No persistent servers or databases required
- **Secure**: OAuth 2.0 authentication with minimal required permissions

### System Flow

1. **Onboarding**: One-time setup via web interface
2. **Nightly Scheduling**: AI runs at 4 AM to schedule your next day
3. **Real-Time Learning**: Responds to calendar interactions instantly
4. **Daily Debrief**: Sends productivity summary and insights each evening

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud Project with Calendar, Tasks, and Drive APIs enabled
- SendGrid account for email notifications
- AWS account (for serverless deployment)

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository>
cd project-coach
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Configure Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add your domain to authorized origins
   - Update `.env` with your credentials

4. **Deploy to AWS**
```bash
npm run deploy
```

### Environment Variables

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback

# Application Configuration
NODE_ENV=production
BASE_URL=https://your-domain.com

# Email Configuration
EMAIL_FROM=noreply@your-domain.com
SENDGRID_API_KEY=your_sendgrid_api_key

# AWS Configuration
AWS_REGION=us-east-1
STAGE=prod
```

## 📋 User Configuration

After onboarding, users can customize their experience by editing `coach_config.yaml` in their Google Drive:

```yaml
projects:
  - name: "Website Redesign"
    totalEstimatedHours: 20
    description: "Complete overhaul of company website"
    sessionLength: 60

habits:
  - name: "Daily Standup"
    type: daily
    count: 1
    estimatedMinutes: 15
    timePreference: morning

settings:
  default_task_block_minutes: 45
  working_hours_start: 9
  working_hours_end: 17
  timezone: "America/New_York"
  daily_debrief_enabled: true
```

## 🎯 How It Works

### 1. Task Scheduling
- Reads incomplete tasks from Google Tasks
- Matches tasks with projects and habits from config
- Finds available time slots in your calendar
- Creates events in the "AI Coach" calendar as invitations

### 2. Learning from Interactions
- **Accept Invitation** = Task Completed
- **Maybe** = Task Paused
- **Decline** = Task Declined
- **No Response** = Task Abandoned

### 3. Opportunity Scheduling
When you complete a task early:
- Calculates available time
- Finds highest-priority task that fits
- Automatically schedules and notifies you

### 4. Daily Insights
Evening email includes:
- Completion statistics
- Time efficiency analysis
- Category performance
- Suggestions for improvement

## 🔧 Development

### Local Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Project Structure
```
src/
├── handlers/          # Serverless function handlers
├── services/          # Core business logic
├── utils/            # Utility functions
├── config/           # Configuration files
└── index.js          # Main application entry

public/               # Static web assets
serverless.yml        # Serverless configuration
```

### Key Services

- **AuthService**: Google OAuth 2.0 authentication
- **GoogleCalendarService**: Calendar API integration
- **GoogleTasksService**: Tasks API integration  
- **GoogleDriveService**: Drive API and config management
- **SchedulingEngine**: Core scheduling algorithm
- **AnalyticsService**: Learning and insights generation
- **EmailService**: Daily debrief emails

## 📊 API Endpoints

### Webhooks
- `POST /webhook/calendar` - Calendar event notifications
- `POST /webhook/feedback` - User feedback processing

### Authentication
- `GET /auth/google` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler

### Scheduling
- `POST /schedule/nightly` - Trigger nightly scheduling
- `POST /schedule/opportunity` - Manual opportunity scheduling

## 🔒 Security

- **Minimal Permissions**: Only requests necessary Google API scopes
- **Secure Storage**: Tokens stored in AWS Secrets Manager/Google Secret Manager
- **HTTPS Only**: All communications encrypted in transit
- **No Data Storage**: User data remains in their Google account

## 🚀 Deployment

### AWS Lambda
```bash
# Deploy all functions
serverless deploy

# Deploy specific function
serverless deploy function -f nightlyScheduler
```

### Google Cloud Functions
```bash
# Deploy to Google Cloud
gcloud functions deploy project-coach --runtime nodejs18
```

### Environment-Specific Configs
```bash
# Deploy to staging
serverless deploy --stage staging

# Deploy to production  
serverless deploy --stage prod
```

## 📈 Monitoring & Analytics

### Logging
- Structured logging with Winston
- Centralized log aggregation
- Error tracking and alerting

### Metrics
- Task completion rates
- Scheduling accuracy
- User engagement analytics
- System performance metrics

### Health Checks
- `GET /health` - System status endpoint
- Calendar API connectivity
- Email service status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines
- Follow existing code style
- Add comprehensive tests
- Update documentation
- Use semantic commit messages

## 📚 API Reference

### Scheduling Engine Options
```javascript
const options = {
  workingHours: { start: 9, end: 17 },
  minimumBreak: 15,
  maxTaskDuration: 90,
  contextSwitchingPenalty: 10
};
```

### Learning System Parameters
```javascript
const learningConfig = {
  estimateAdjustmentFactor: 0.1,
  minimumDataPoints: 3,
  categoryLearningEnabled: true,
  timePreferenceLearning: true
};
```

## 🆘 Troubleshooting

### Common Issues

**Calendar events not appearing**
- Check webhook setup
- Verify calendar permissions
- Ensure suggestion calendar exists

**Email notifications not sent**
- Validate SendGrid configuration
- Check email templates
- Verify recipient email address

**OAuth authentication fails**
- Confirm redirect URI matches
- Check Google Cloud Console settings
- Verify client ID/secret

### Debug Mode
```bash
NODE_ENV=development npm start
```

## 📄 License

MIT License - see LICENSE file for details

## 🙋 Support

- 📧 Email: support@projectcoach.ai
- 📚 Documentation: https://docs.projectcoach.ai
- 🐛 Issues: GitHub Issues
- 💬 Discord: https://discord.gg/projectcoach

---

**Project Coach v5.0** - Making productivity invisible, intelligent, and automatic.