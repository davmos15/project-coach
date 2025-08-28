import { google } from 'googleapis';
import { CALENDAR_NAMES, INVITATION_RESPONSES } from '../config/constants.js';
import logger from '../utils/logger.js';

class GoogleCalendarService {
  constructor(oauth2Client) {
    this.oauth2Client = oauth2Client;
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async createSuggestionCalendar() {
    try {
      const calendar = {
        summary: CALENDAR_NAMES.SUGGESTION,
        description: 'AI-managed calendar for task and project scheduling',
        timeZone: 'America/New_York'
      };

      const response = await this.calendar.calendars.insert({
        requestBody: calendar
      });

      logger.info(`Created suggestion calendar: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating suggestion calendar:', error);
      throw error;
    }
  }

  async listCalendars() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items;
    } catch (error) {
      logger.error('Error listing calendars:', error);
      throw error;
    }
  }

  async getCalendarByName(name) {
    try {
      const calendars = await this.listCalendars();
      return calendars.find(cal => cal.summary === name);
    } catch (error) {
      logger.error(`Error finding calendar ${name}:`, error);
      throw error;
    }
  }

  async getEvents(calendarId, timeMin, timeMax) {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items;
    } catch (error) {
      logger.error('Error getting events:', error);
      throw error;
    }
  }

  async createEvent(calendarId, event) {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        sendUpdates: 'all'
      });

      logger.info(`Created event: ${response.data.summary}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(calendarId, eventId, event) {
    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
        sendUpdates: 'all'
      });

      logger.info(`Updated event: ${eventId}`);
      return response.data;
    } catch (error) {
      logger.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(calendarId, eventId) {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all'
      });

      logger.info(`Deleted event: ${eventId}`);
    } catch (error) {
      logger.error('Error deleting event:', error);
      throw error;
    }
  }

  async setupWebhookNotification(calendarId, webhookUrl) {
    try {
      const watchRequest = {
        id: `calendar-${calendarId}-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
        params: {
          ttl: 3600 * 24 * 7
        }
      };

      const response = await this.calendar.events.watch({
        calendarId,
        requestBody: watchRequest
      });

      logger.info(`Set up webhook for calendar: ${calendarId}`);
      return response.data;
    } catch (error) {
      logger.error('Error setting up webhook:', error);
      throw error;
    }
  }

  async getBusyTimes(calendarIds, timeMin, timeMax) {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: calendarIds.map(id => ({ id }))
        }
      });

      return response.data.calendars;
    } catch (error) {
      logger.error('Error getting busy times:', error);
      throw error;
    }
  }

  parseAttendeeResponse(event, userEmail) {
    const attendee = event.attendees?.find(a => a.email === userEmail);
    
    if (!attendee) return null;

    switch (attendee.responseStatus) {
      case INVITATION_RESPONSES.YES:
        return 'completed';
      case INVITATION_RESPONSES.MAYBE:
        return 'paused';
      case INVITATION_RESPONSES.NO:
        return 'declined';
      default:
        return 'no_response';
    }
  }

  createTaskEvent(task, startTime, endTime, userEmail) {
    return {
      summary: task.title || task.summary,
      description: `AI-scheduled task\n\nOriginal task: ${task.title}\nEstimated duration: ${task.estimatedMinutes || 45} minutes`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/New_York'
      },
      attendees: [{ email: userEmail }],
      reminders: {
        useDefault: true
      },
      extendedProperties: {
        private: {
          taskId: task.id,
          type: 'ai-scheduled-task',
          estimatedMinutes: task.estimatedMinutes?.toString() || '45'
        }
      }
    };
  }
}

export default GoogleCalendarService;