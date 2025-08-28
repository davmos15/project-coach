import nodemailer from 'nodemailer';
import { config } from '../config/environment.js';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: config.email.sendgridApiKey
      }
    });
  }

  async sendDailyDebrief(userEmail, debriefData) {
    try {
      const html = this.generateDebriefHTML(debriefData);
      const subject = `Daily Productivity Summary - ${debriefData.date}`;

      const mailOptions = {
        from: config.email.from,
        to: userEmail,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Daily debrief sent to ${userEmail}`);
      return result;

    } catch (error) {
      logger.error('Error sending daily debrief:', error);
      throw error;
    }
  }

  async sendOpportunityNotification(userEmail, opportunityData) {
    try {
      const html = this.generateOpportunityHTML(opportunityData);
      const subject = `⚡ New Task Scheduled - ${opportunityData.task.title}`;

      const mailOptions = {
        from: config.email.from,
        to: userEmail,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Opportunity notification sent to ${userEmail}`);
      return result;

    } catch (error) {
      logger.error('Error sending opportunity notification:', error);
      throw error;
    }
  }

  generateDebriefHTML(data) {
    const {
      date,
      completedTasks,
      pausedTasks,
      declinedTasks,
      totalScheduled,
      totalCompleted,
      completionRate,
      insights,
      topCategories,
      timeSpent
    } = data;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Productivity Summary</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #4a90e2; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
        .section { margin: 25px 0; }
        .section h3 { color: #2c3e50; margin-bottom: 15px; }
        .task-list { margin: 10px 0; }
        .task-item { background: #f8f9fa; padding: 10px 15px; margin: 5px 0; border-radius: 6px; border-left: 4px solid #27ae60; }
        .task-item.paused { border-left-color: #f39c12; }
        .task-item.declined { border-left-color: #e74c3c; }
        .insights { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 5px; }
        .feedback-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .energy-rating { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
        .energy-rating input[type="radio"] { margin: 0 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Daily Productivity Summary</h1>
            <p>${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div class="content">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${totalScheduled}</div>
                    <div class="stat-label">Scheduled</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalCompleted}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${Math.round(completionRate)}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${Math.round(timeSpent / 60)}h</div>
                    <div class="stat-label">Time Spent</div>
                </div>
            </div>

            ${completedTasks.length > 0 ? `
            <div class="section">
                <h3>✅ Completed Tasks (${completedTasks.length})</h3>
                <div class="task-list">
                    ${completedTasks.map(task => `
                        <div class="task-item">
                            <strong>${task.title}</strong>
                            ${task.actualDuration ? `<div style="font-size: 12px; color: #666;">Completed in ${task.actualDuration} minutes</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${pausedTasks.length > 0 ? `
            <div class="section">
                <h3>⏸️ Paused Tasks (${pausedTasks.length})</h3>
                <div class="task-list">
                    ${pausedTasks.map(task => `
                        <div class="task-item paused">
                            <strong>${task.title}</strong>
                            <div style="margin-top: 10px;">
                                <a href="${config.app.baseUrl}/feedback/reschedule?taskId=${task.id}" class="button">Reschedule for Tomorrow</a>
                                <a href="${config.app.baseUrl}/feedback/extend?taskId=${task.id}" class="button">Add 30 Minutes</a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${declinedTasks.length > 0 ? `
            <div class="section">
                <h3>❌ Skipped Tasks (${declinedTasks.length})</h3>
                <div class="task-list">
                    ${declinedTasks.map(task => `
                        <div class="task-item declined">
                            <strong>${task.title}</strong>
                            <div style="margin-top: 10px;">
                                <a href="${config.app.baseUrl}/feedback/reschedule?taskId=${task.id}" class="button">Reschedule</a>
                                <a href="${config.app.baseUrl}/feedback/priority?taskId=${task.id}" class="button">Change Priority</a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${insights && insights.length > 0 ? `
            <div class="insights">
                <h3>💡 Today's Insights</h3>
                <ul>
                    ${insights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="feedback-section">
                <h3>📊 Quick Feedback</h3>
                <p>How was your energy level today?</p>
                <div class="energy-rating">
                    <span>Low</span>
                    <input type="radio" name="energy" value="1"> 1
                    <input type="radio" name="energy" value="2"> 2
                    <input type="radio" name="energy" value="3"> 3
                    <input type="radio" name="energy" value="4"> 4
                    <input type="radio" name="energy" value="5"> 5
                    <span>High</span>
                </div>
                <p style="font-size: 12px; color: #666;">This helps me learn your optimal working times!</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p style="color: #666;">Tomorrow's schedule will be ready by 4:00 AM.</p>
                <p style="font-size: 12px; color: #999;">Generated by Project Coach v5.0</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  generateOpportunityHTML(data) {
    const { task, startTime, duration } = data;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Task Scheduled</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .task-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #4a90e2; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Opportunity Scheduled!</h1>
            <p>You finished early, so I found something productive for you</p>
        </div>
        
        <div class="content">
            <div class="task-card">
                <h3>${task.title}</h3>
                <p><strong>When:</strong> ${new Date(startTime).toLocaleTimeString()}</p>
                <p><strong>Duration:</strong> ${duration} minutes</p>
                ${task.description ? `<p><strong>Notes:</strong> ${task.description}</p>` : ''}
            </div>

            <p style="text-align: center; margin-top: 20px; color: #666;">
                Check your Google Calendar to accept or modify this suggestion.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

export default EmailService;