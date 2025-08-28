import AuthService from '../services/auth.js';
import GoogleCalendarService from '../services/googleCalendar.js';
import GoogleTasksService from '../services/googleTasks.js';
import GoogleDriveService from '../services/googleDrive.js';
import SchedulingEngine from '../services/schedulingEngine.js';
import logger from '../utils/logger.js';

export const nightlyHandler = async (event, context) => {
  try {
    logger.info('Starting nightly scheduling process');

    const authService = new AuthService();
    const calendarService = new GoogleCalendarService(authService.getOAuth2Client());
    const tasksService = new GoogleTasksService(authService.getOAuth2Client());
    const driveService = new GoogleDriveService(authService.getOAuth2Client());

    const userConfig = await driveService.getConfigFile();
    
    const schedulingEngine = new SchedulingEngine(
      calendarService,
      tasksService,
      driveService,
      userConfig
    );

    const schedule = await schedulingEngine.runNightlyScheduling();

    logger.info('Nightly scheduling completed successfully', {
      itemsScheduled: schedule.length
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        itemsScheduled: schedule.length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error in nightly scheduling:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Nightly scheduling failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

export const opportunityHandler = async (event, context) => {
  try {
    const { startTime, endTime } = JSON.parse(event.body || '{}');
    
    if (!startTime || !endTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'startTime and endTime are required' })
      };
    }

    logger.info('Starting opportunity scheduling', { startTime, endTime });

    const authService = new AuthService();
    const calendarService = new GoogleCalendarService(authService.getOAuth2Client());
    const tasksService = new GoogleTasksService(authService.getOAuth2Client());
    const driveService = new GoogleDriveService(authService.getOAuth2Client());

    const result = await opportunityScheduler(
      new Date(startTime),
      new Date(endTime),
      calendarService,
      tasksService,
      driveService
    );

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    logger.error('Error in opportunity scheduling:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Opportunity scheduling failed',
        message: error.message
      })
    };
  }
};

export const opportunityScheduler = async (startTime, endTime, calendarService, tasksService, driveService) => {
  try {
    const availableMinutes = Math.round((endTime - startTime) / (1000 * 60));
    
    if (availableMinutes < 15) {
      logger.info('Available time too short for opportunity scheduling');
      return { scheduled: false, reason: 'insufficient_time' };
    }

    const incompleteTasks = await tasksService.getIncompleteTasks();
    const suitableTasks = incompleteTasks.filter(task => {
      const parsedTask = tasksService.parseTaskForScheduling(task);
      return parsedTask.estimatedMinutes <= availableMinutes;
    });

    if (suitableTasks.length === 0) {
      logger.info('No suitable tasks found for opportunity scheduling');
      return { scheduled: false, reason: 'no_suitable_tasks' };
    }

    suitableTasks.sort((a, b) => {
      const aParsed = tasksService.parseTaskForScheduling(a);
      const bParsed = tasksService.parseTaskForScheduling(b);
      
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[aParsed.priority] || 2;
      const bPriority = priorityWeight[bParsed.priority] || 2;
      
      return bPriority - aPriority;
    });

    const selectedTask = suitableTasks[0];
    const parsedTask = tasksService.parseTaskForScheduling(selectedTask);

    const calendars = await calendarService.listCalendars();
    const suggestionCalendar = calendars.find(cal => cal.summary === 'AI Coach');
    
    if (!suggestionCalendar) {
      throw new Error('AI Coach calendar not found');
    }

    const taskEndTime = new Date(startTime);
    taskEndTime.setMinutes(taskEndTime.getMinutes() + parsedTask.estimatedMinutes);

    const event = calendarService.createTaskEvent(
      parsedTask,
      startTime,
      taskEndTime,
      'user@example.com'
    );

    event.summary = `⚡ ${event.summary}`;
    event.description = `${event.description}\n\nOpportunity scheduling: Added due to early task completion`;

    const createdEvent = await calendarService.createEvent(suggestionCalendar.id, event);

    logger.info('Opportunity scheduled successfully', {
      task: parsedTask.title,
      duration: parsedTask.estimatedMinutes,
      startTime: startTime.toISOString()
    });

    return {
      scheduled: true,
      task: parsedTask,
      event: createdEvent,
      availableMinutes,
      usedMinutes: parsedTask.estimatedMinutes
    };

  } catch (error) {
    logger.error('Error in opportunity scheduler:', error);
    throw error;
  }
};