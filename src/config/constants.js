export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/drive.file'
];

export const CALENDAR_NAMES = {
  SUGGESTION: 'AI Coach'
};

export const CONFIG_FILE = {
  NAME: 'coach_config.yaml',
  LOCATION: 'root'
};

export const TASK_STATES = {
  COMPLETED: 'completed',
  PAUSED: 'paused', 
  DECLINED: 'declined',
  ABANDONED: 'abandoned'
};

export const INVITATION_RESPONSES = {
  YES: 'accepted',
  MAYBE: 'tentative',
  NO: 'declined',
  NO_RESPONSE: 'needsAction'
};

export const DEFAULT_SETTINGS = {
  DEFAULT_TASK_BLOCK_MINUTES: 45,
  MAX_TASK_BLOCK_MINUTES: 90,
  WORKING_HOURS_START: 9,
  WORKING_HOURS_END: 17,
  TIMEZONE: 'America/New_York',
  DAILY_DEBRIEF_HOUR: 18
};

export const EMAIL_TEMPLATES = {
  DAILY_DEBRIEF: 'daily_debrief',
  OPPORTUNITY_NOTIFICATION: 'opportunity_notification',
  WELCOME: 'welcome'
};