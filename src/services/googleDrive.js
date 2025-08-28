import { google } from 'googleapis';
import YAML from 'yamljs';
import { CONFIG_FILE } from '../config/constants.js';
import logger from '../utils/logger.js';

class GoogleDriveService {
  constructor(oauth2Client) {
    this.oauth2Client = oauth2Client;
    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

  async createConfigFile() {
    try {
      const defaultConfig = {
        projects: [
          {
            name: 'Website Redesign',
            totalEstimatedHours: 20,
            description: 'Complete overhaul of company website'
          },
          {
            name: 'Mobile App Development',
            totalEstimatedHours: 40,
            description: 'Build iOS and Android app'
          }
        ],
        habits: [
          {
            name: 'Daily Standup',
            type: 'daily',
            count: 1,
            estimatedMinutes: 15,
            description: 'Team standup meeting'
          },
          {
            name: 'Code Review',
            type: 'daily',
            count: 2,
            estimatedMinutes: 30,
            description: 'Review team code submissions'
          },
          {
            name: 'Exercise',
            type: 'weekly',
            count: 3,
            estimatedMinutes: 45,
            description: 'Physical exercise session'
          }
        ],
        settings: {
          default_task_block_minutes: 45,
          max_task_block_minutes: 90,
          working_hours_start: 9,
          working_hours_end: 17,
          timezone: 'America/New_York',
          daily_debrief_hour: 18,
          daily_debrief_enabled: true,
          opportunity_scheduling_enabled: true,
          minimum_break_minutes: 15
        },
        user_preferences: {
          focus_time_preference: 'morning',
          meeting_time_preference: 'afternoon',
          deep_work_blocks: true,
          context_switching_penalty: 10
        }
      };

      const yamlContent = YAML.stringify(defaultConfig, 2);
      
      const fileMetadata = {
        name: CONFIG_FILE.NAME,
        parents: ['root']
      };

      const media = {
        mimeType: 'text/yaml',
        body: yamlContent
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      logger.info(`Created config file: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating config file:', error);
      throw error;
    }
  }

  async findConfigFile() {
    try {
      const response = await this.drive.files.list({
        q: `name='${CONFIG_FILE.NAME}' and parents in 'root' and trashed=false`,
        fields: 'files(id, name, modifiedTime)'
      });

      return response.data.files[0] || null;
    } catch (error) {
      logger.error('Error finding config file:', error);
      throw error;
    }
  }

  async getConfigFile() {
    try {
      let configFile = await this.findConfigFile();
      
      if (!configFile) {
        logger.info('Config file not found, creating default');
        configFile = await this.createConfigFile();
      }

      const response = await this.drive.files.get({
        fileId: configFile.id,
        alt: 'media'
      });

      const yamlContent = response.data;
      const config = YAML.parse(yamlContent);
      
      logger.info('Successfully loaded config file');
      return config;
    } catch (error) {
      logger.error('Error getting config file:', error);
      throw error;
    }
  }

  async updateConfigFile(config) {
    try {
      const configFile = await this.findConfigFile();
      if (!configFile) {
        throw new Error('Config file not found');
      }

      const yamlContent = YAML.stringify(config, 2);
      
      const media = {
        mimeType: 'text/yaml',
        body: yamlContent
      };

      const response = await this.drive.files.update({
        fileId: configFile.id,
        media: media
      });

      logger.info('Config file updated successfully');
      return response.data;
    } catch (error) {
      logger.error('Error updating config file:', error);
      throw error;
    }
  }

  parseProjectsFromConfig(config) {
    const projects = config.projects || [];
    
    return projects.map(project => ({
      name: project.name,
      totalEstimatedHours: project.totalEstimatedHours || 1,
      totalEstimatedMinutes: (project.totalEstimatedHours || 1) * 60,
      description: project.description,
      sessionLength: project.sessionLength || config.settings?.default_task_block_minutes || 45,
      priority: project.priority || 'medium'
    }));
  }

  parseHabitsFromConfig(config) {
    const habits = config.habits || [];
    
    return habits.map(habit => ({
      name: habit.name,
      type: habit.type || 'daily',
      count: habit.count || 1,
      estimatedMinutes: habit.estimatedMinutes || config.settings?.default_task_block_minutes || 30,
      description: habit.description,
      priority: habit.priority || 'medium',
      timePreference: habit.timePreference || 'any'
    }));
  }

  getSettingsFromConfig(config) {
    const settings = config.settings || {};
    const userPrefs = config.user_preferences || {};
    
    return {
      defaultTaskBlockMinutes: settings.default_task_block_minutes || 45,
      maxTaskBlockMinutes: settings.max_task_block_minutes || 90,
      workingHoursStart: settings.working_hours_start || 9,
      workingHoursEnd: settings.working_hours_end || 17,
      timezone: settings.timezone || 'America/New_York',
      dailyDebriefHour: settings.daily_debrief_hour || 18,
      dailyDebriefEnabled: settings.daily_debrief_enabled !== false,
      opportunitySchedulingEnabled: settings.opportunity_scheduling_enabled !== false,
      minimumBreakMinutes: settings.minimum_break_minutes || 15,
      focusTimePreference: userPrefs.focus_time_preference || 'morning',
      meetingTimePreference: userPrefs.meeting_time_preference || 'afternoon',
      deepWorkBlocks: userPrefs.deep_work_blocks !== false,
      contextSwitchingPenalty: userPrefs.context_switching_penalty || 10
    };
  }
}

export default GoogleDriveService;