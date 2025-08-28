import { google } from 'googleapis';
import logger from '../utils/logger.js';

class GoogleTasksService {
  constructor(oauth2Client) {
    this.oauth2Client = oauth2Client;
    this.tasks = google.tasks({ version: 'v1', auth: oauth2Client });
  }

  async getTaskLists() {
    try {
      const response = await this.tasks.tasklists.list();
      return response.data.items;
    } catch (error) {
      logger.error('Error getting task lists:', error);
      throw error;
    }
  }

  async getDefaultTaskList() {
    try {
      const taskLists = await this.getTaskLists();
      return taskLists.find(list => list.title === 'My Tasks') || taskLists[0];
    } catch (error) {
      logger.error('Error getting default task list:', error);
      throw error;
    }
  }

  async getTasks(tasklistId = '@default') {
    try {
      const response = await this.tasks.tasks.list({
        tasklist: tasklistId,
        showCompleted: false,
        showDeleted: false,
        maxResults: 100
      });

      const tasks = response.data.items || [];
      logger.info(`Retrieved ${tasks.length} tasks`);
      return tasks;
    } catch (error) {
      logger.error('Error getting tasks:', error);
      throw error;
    }
  }

  async getIncompleteTasks() {
    try {
      const defaultTaskList = await this.getDefaultTaskList();
      const tasks = await this.getTasks(defaultTaskList.id);

      return tasks.filter(task => task.status !== 'completed');
    } catch (error) {
      logger.error('Error getting incomplete tasks:', error);
      throw error;
    }
  }

  async updateTask(tasklistId, taskId, taskData) {
    try {
      const response = await this.tasks.tasks.update({
        tasklist: tasklistId,
        task: taskId,
        requestBody: taskData
      });

      logger.info(`Updated task: ${taskId}`);
      return response.data;
    } catch (error) {
      logger.error('Error updating task:', error);
      throw error;
    }
  }

  async completeTask(tasklistId, taskId) {
    try {
      const taskData = {
        status: 'completed',
        completed: new Date().toISOString()
      };

      return await this.updateTask(tasklistId, taskId, taskData);
    } catch (error) {
      logger.error('Error completing task:', error);
      throw error;
    }
  }

  parseTaskForScheduling(task) {
    const title = task.title;
    const notes = task.notes || '';

    let estimatedMinutes = 45;

    const timeMatch = notes.match(/(\d+)\s*(min|minutes|hour|hours|h)/i);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();

      if (unit.includes('hour') || unit === 'h') {
        estimatedMinutes = value * 60;
      } else {
        estimatedMinutes = value;
      }
    }

    const priority = this.extractPriority(title, notes);
    const category = this.extractCategory(title, notes);

    return {
      id: task.id,
      title: task.title,
      notes: task.notes,
      due: task.due,
      estimatedMinutes,
      priority,
      category,
      originalTask: task
    };
  }

  extractPriority(title, notes) {
    const text = `${title} ${notes}`.toLowerCase();

    if (text.includes('urgent') || text.includes('asap') || text.includes('!!!')) {
      return 'high';
    }
    if (text.includes('important') || text.includes('!!')) {
      return 'medium';
    }
    if (text.includes('low priority') || text.includes('when time allows')) {
      return 'low';
    }

    return 'medium';
  }

  extractCategory(title, notes) {
    const text = `${title} ${notes}`.toLowerCase();

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
}

export default GoogleTasksService;