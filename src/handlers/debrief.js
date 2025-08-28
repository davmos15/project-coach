import AuthService from '../services/auth.js';
import GoogleCalendarService from '../services/googleCalendar.js';
import GoogleDriveService from '../services/googleDrive.js';
import EmailService from '../services/emailService.js';
import logger from '../utils/logger.js';

export const dailyHandler = async (_event, _context) => {
  try {
    logger.info('Starting daily debrief process');

    const authService = new AuthService();
    const calendarService = new GoogleCalendarService(authService.getOAuth2Client());
    const driveService = new GoogleDriveService(authService.getOAuth2Client());
    const emailService = new EmailService();

    const userConfig = await driveService.getConfigFile();
    const settings = driveService.getSettingsFromConfig(userConfig);

    if (!settings.dailyDebriefEnabled) {
      logger.info('Daily debrief is disabled for this user');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Daily debrief disabled' })
      };
    }

    const debriefData = await generateDebriefData(calendarService, userConfig);

    const userEmail = 'user@example.com';
    await emailService.sendDailyDebrief(userEmail, debriefData);

    logger.info('Daily debrief completed successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        debriefSent: true,
        stats: {
          totalScheduled: debriefData.totalScheduled,
          totalCompleted: debriefData.totalCompleted,
          completionRate: debriefData.completionRate
        },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error in daily debrief:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Daily debrief failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

async function generateDebriefData(calendarService, userConfig) {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const calendars = await calendarService.listCalendars();
    const suggestionCalendar = calendars.find(cal => cal.summary === 'AI Coach');

    if (!suggestionCalendar) {
      throw new Error('AI Coach calendar not found');
    }

    const events = await calendarService.getEvents(
      suggestionCalendar.id,
      startOfDay,
      endOfDay
    );

    const aiScheduledEvents = events.filter(event =>
      event.extendedProperties?.private?.type === 'ai-scheduled-task'
    );

    const completedTasks = [];
    const pausedTasks = [];
    const declinedTasks = [];
    let totalTimeSpent = 0;

    const userEmail = 'user@example.com';

    for (const event of aiScheduledEvents) {
      const response = calendarService.parseAttendeeResponse(event, userEmail);
      const estimatedMinutes = parseInt(event.extendedProperties?.private?.estimatedMinutes || '45');

      const taskData = {
        id: event.id,
        title: event.summary,
        estimatedDuration: estimatedMinutes,
        actualDuration: null,
        category: extractCategoryFromEvent(event),
        startTime: event.start.dateTime,
        endTime: event.end.dateTime
      };

      switch (response) {
      case 'completed':
        if (event.start && event.end) {
          const actualDuration = Math.round(
            (new Date(event.end.dateTime) - new Date(event.start.dateTime)) / (1000 * 60)
          );
          taskData.actualDuration = actualDuration;
          totalTimeSpent += actualDuration;
        } else {
          totalTimeSpent += estimatedMinutes;
        }
        completedTasks.push(taskData);
        break;

      case 'paused':
        pausedTasks.push(taskData);
        break;

      case 'declined':
        declinedTasks.push(taskData);
        break;
      }
    }

    const totalScheduled = aiScheduledEvents.length;
    const totalCompleted = completedTasks.length;
    const completionRate = totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : 0;

    const insights = generateInsights(completedTasks, pausedTasks, declinedTasks, userConfig);
    const topCategories = getTopCategories(completedTasks);

    return {
      date: today.toISOString(),
      completedTasks,
      pausedTasks,
      declinedTasks,
      totalScheduled,
      totalCompleted,
      completionRate,
      timeSpent: totalTimeSpent,
      insights,
      topCategories
    };

  } catch (error) {
    logger.error('Error generating debrief data:', error);
    throw error;
  }
}

function extractCategoryFromEvent(event) {
  const title = (event.summary || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  const text = `${title} ${description}`;

  const categories = {
    'meeting': ['meeting', 'call', 'standup', 'sync'],
    'coding': ['code', 'develop', 'implement', 'debug', 'fix', 'programming'],
    'writing': ['write', 'document', 'blog', 'article', 'notes'],
    'research': ['research', 'investigate', 'analyze', 'study', 'learn'],
    'planning': ['plan', 'strategy', 'roadmap', 'outline'],
    'communication': ['email', 'slack', 'message', 'respond', 'follow up'],
    'admin': ['admin', 'paperwork', 'organize', 'file', 'expense']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }

  return 'general';
}

function generateInsights(completedTasks, pausedTasks, declinedTasks, _userConfig) {
  const insights = [];

  const totalTasks = completedTasks.length + pausedTasks.length + declinedTasks.length;
  if (totalTasks === 0) return insights;

  const completionRate = (completedTasks.length / totalTasks) * 100;

  if (completionRate >= 80) {
    insights.push('🎉 Excellent productivity today! You completed most of your scheduled tasks.');
  } else if (completionRate >= 60) {
    insights.push('👍 Good progress today! You\'re on track with your goals.');
  } else if (completionRate >= 40) {
    insights.push('📈 Room for improvement. Consider adjusting your schedule or task estimates.');
  } else {
    insights.push('🤔 Low completion rate today. Let\'s analyze what went wrong and adjust.');
  }

  const avgEstimated = completedTasks.reduce((sum, task) => sum + task.estimatedDuration, 0) / completedTasks.length;
  const avgActual = completedTasks
    .filter(task => task.actualDuration)
    .reduce((sum, task) => sum + task.actualDuration, 0) / completedTasks.filter(task => task.actualDuration).length;

  if (avgActual && avgEstimated) {
    const efficiency = avgActual / avgEstimated;
    if (efficiency < 0.8) {
      insights.push('⚡ You\'re working faster than expected! I\'ll adjust future estimates.');
    } else if (efficiency > 1.2) {
      insights.push('🐌 Tasks are taking longer than expected. I\'ll increase future estimates.');
    }
  }

  const categories = getTopCategories(completedTasks);
  if (categories.length > 0) {
    insights.push(`🏆 Most productive category today: ${categories[0].category} (${categories[0].count} tasks)`);
  }

  if (declinedTasks.length > 2) {
    insights.push('❌ Several tasks were declined. Consider reviewing your priorities or schedule.');
  }

  if (pausedTasks.length > 1) {
    insights.push('⏸️ Multiple tasks were paused. You might benefit from longer focused blocks.');
  }

  return insights;
}

function getTopCategories(tasks) {
  const categoryCounts = {};

  tasks.forEach(task => {
    const category = task.category || 'general';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}