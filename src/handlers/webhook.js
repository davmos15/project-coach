import AuthService from '../services/auth.js';
import GoogleCalendarService from '../services/googleCalendar.js';
import GoogleTasksService from '../services/googleTasks.js';
import GoogleDriveService from '../services/googleDrive.js';
import { opportunityScheduler } from './scheduler.js';
import logger from '../utils/logger.js';
import { TASK_STATES } from '../config/constants.js';

export const calendarHandler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Goog-Channel-ID,X-Goog-Channel-Token,X-Goog-Resource-ID,X-Goog-Resource-URI,X-Goog-Channel-Expiration,X-Goog-Resource-State',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const calendarHeaders = event.headers || {};

    const channelId = calendarHeaders['X-Goog-Channel-ID'] || calendarHeaders['x-goog-channel-id'];
    const resourceState = calendarHeaders['X-Goog-Resource-State'] || calendarHeaders['x-goog-resource-state'];
    const resourceId = calendarHeaders['X-Goog-Resource-ID'] || calendarHeaders['x-goog-resource-id'];

    logger.info('Calendar webhook received', {
      channelId,
      resourceState,
      resourceId
    });

    if (resourceState === 'sync') {
      logger.info('Sync message received, acknowledging');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'sync acknowledged' })
      };
    }

    if (resourceState === 'exists') {
      await handleCalendarEvent(channelId, resourceId, body);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'processed' })
    };

  } catch (error) {
    logger.error('Error processing calendar webhook:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleCalendarEvent(channelId, calendarId, eventData) {
  try {
    logger.info('Processing calendar event', { channelId, calendarId });

    const authService = new AuthService();
    const calendarService = new GoogleCalendarService(authService.getOAuth2Client());
    const tasksService = new GoogleTasksService(authService.getOAuth2Client());
    const driveService = new GoogleDriveService(authService.getOAuth2Client());

    const events = await calendarService.getEvents(
      calendarId,
      new Date(),
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );

    const aiScheduledEvents = events.filter(event => 
      event.extendedProperties?.private?.type === 'ai-scheduled-task'
    );

    for (const event of aiScheduledEvents) {
      await processTaskEvent(event, calendarService, tasksService, driveService);
    }

  } catch (error) {
    logger.error('Error handling calendar event:', error);
    throw error;
  }
}

async function processTaskEvent(event, calendarService, tasksService, driveService) {
  try {
    if (!event.attendees || event.attendees.length === 0) {
      return;
    }

    const userEmail = event.attendees[0].email;
    const response = calendarService.parseAttendeeResponse(event, userEmail);
    const taskId = event.extendedProperties?.private?.taskId;
    const estimatedMinutes = parseInt(event.extendedProperties?.private?.estimatedMinutes || '45');

    if (!response || response === 'no_response') {
      return;
    }

    logger.info(`Processing task response: ${response} for event: ${event.summary}`);

    switch (response) {
      case 'completed':
        await handleTaskCompleted(event, taskId, estimatedMinutes, calendarService, tasksService);
        break;
      
      case 'paused':
        await handleTaskPaused(event, taskId, calendarService);
        break;
      
      case 'declined':
        await handleTaskDeclined(event, taskId, calendarService);
        break;
    }

  } catch (error) {
    logger.error('Error processing task event:', error);
    throw error;
  }
}

async function handleTaskCompleted(event, taskId, estimatedMinutes, calendarService, tasksService) {
  try {
    const actualStart = new Date(event.start.dateTime);
    const now = new Date();
    const actualDuration = Math.round((now - actualStart) / (1000 * 60));

    if (taskId) {
      const taskLists = await tasksService.getTaskLists();
      const defaultTaskList = taskLists[0];
      await tasksService.completeTask(defaultTaskList.id, taskId);
    }

    logger.info(`Task completed: ${event.summary}`, {
      estimatedMinutes,
      actualDuration,
      efficiency: actualDuration / estimatedMinutes
    });

    if (actualDuration < estimatedMinutes - 10) {
      const freeTimeMinutes = estimatedMinutes - actualDuration - 10;
      const freeTimeStart = new Date(now.getTime() + 5 * 60 * 1000);
      const freeTimeEnd = new Date(freeTimeStart.getTime() + freeTimeMinutes * 60 * 1000);

      await opportunityScheduler(freeTimeStart, freeTimeEnd, calendarService);
    }

  } catch (error) {
    logger.error('Error handling completed task:', error);
    throw error;
  }
}

async function handleTaskPaused(event, taskId, calendarService) {
  try {
    logger.info(`Task paused: ${event.summary}`);

  } catch (error) {
    logger.error('Error handling paused task:', error);
    throw error;
  }
}

async function handleTaskDeclined(event, taskId, calendarService) {
  try {
    logger.info(`Task declined: ${event.summary}`);
    
    await calendarService.deleteEvent(event.organizer.email, event.id);

  } catch (error) {
    logger.error('Error handling declined task:', error);
    throw error;
  }
}