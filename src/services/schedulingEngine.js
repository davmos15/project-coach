import logger from '../utils/logger.js';
import { DEFAULT_SETTINGS } from '../config/constants.js';

class SchedulingEngine {
  constructor(calendarService, tasksService, driveService, userConfig) {
    this.calendarService = calendarService;
    this.tasksService = tasksService;
    this.driveService = driveService;
    this.userConfig = userConfig;
    this.settings = driveService.getSettingsFromConfig(userConfig);
  }

  async runNightlyScheduling() {
    try {
      logger.info('Starting nightly scheduling run');

      const incompleteTasks = await this.tasksService.getIncompleteTasks();
      const schedulableTasks = this.prepareTasksForScheduling(incompleteTasks);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(tomorrow);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const busyTimes = await this.getBusyTimes(tomorrow, endOfWeek);
      const availableSlots = this.findAvailableSlots(busyTimes, tomorrow, endOfWeek);

      const schedule = this.optimizeSchedule(schedulableTasks, availableSlots);

      await this.createScheduledEvents(schedule);

      logger.info(`Nightly scheduling complete. Scheduled ${schedule.length} items`);
      return schedule;

    } catch (error) {
      logger.error('Error in nightly scheduling:', error);
      throw error;
    }
  }

  prepareTasksForScheduling(tasks) {
    const projects = this.driveService.parseProjectsFromConfig(this.userConfig);
    const habits = this.driveService.parseHabitsFromConfig(this.userConfig);
    
    const schedulableItems = [];

    tasks.forEach(task => {
      const parsedTask = this.tasksService.parseTaskForScheduling(task);
      
      const matchingProject = projects.find(p => 
        parsedTask.title.toLowerCase().includes(p.name.toLowerCase())
      );
      
      if (matchingProject) {
        const sessionsNeeded = Math.ceil(
          matchingProject.totalEstimatedMinutes / matchingProject.sessionLength
        );
        
        for (let i = 0; i < sessionsNeeded; i++) {
          schedulableItems.push({
            ...parsedTask,
            type: 'project_session',
            project: matchingProject.name,
            sessionNumber: i + 1,
            totalSessions: sessionsNeeded,
            estimatedMinutes: Math.min(
              matchingProject.sessionLength,
              matchingProject.totalEstimatedMinutes - (i * matchingProject.sessionLength)
            )
          });
        }
      } else {
        schedulableItems.push({
          ...parsedTask,
          type: 'task'
        });
      }
    });

    habits.forEach(habit => {
      const sessions = this.calculateHabitSessions(habit);
      schedulableItems.push(...sessions);
    });

    return this.prioritizeItems(schedulableItems);
  }

  calculateHabitSessions(habit) {
    const sessions = [];
    const now = new Date();
    
    if (habit.type === 'daily') {
      for (let day = 0; day < 7; day++) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + day);
        
        for (let session = 0; session < habit.count; session++) {
          sessions.push({
            id: `${habit.name}-${targetDate.toDateString()}-${session}`,
            title: habit.name,
            type: 'habit',
            habitType: habit.type,
            estimatedMinutes: habit.estimatedMinutes,
            priority: habit.priority,
            category: 'habit',
            targetDate: targetDate,
            timePreference: habit.timePreference,
            description: habit.description
          });
        }
      }
    } else if (habit.type === 'weekly') {
      for (let session = 0; session < habit.count; session++) {
        sessions.push({
          id: `${habit.name}-week-${session}`,
          title: habit.name,
          type: 'habit',
          habitType: habit.type,
          estimatedMinutes: habit.estimatedMinutes,
          priority: habit.priority,
          category: 'habit',
          timePreference: habit.timePreference,
          description: habit.description,
          weeklySession: session + 1
        });
      }
    }

    return sessions;
  }

  async getBusyTimes(startTime, endTime) {
    try {
      const calendars = await this.calendarService.listCalendars();
      const primaryCalendar = calendars.find(cal => cal.primary) || calendars[0];
      
      const busyTimes = await this.calendarService.getBusyTimes(
        [primaryCalendar.id],
        startTime,
        endTime
      );

      return busyTimes[primaryCalendar.id]?.busy || [];
    } catch (error) {
      logger.error('Error getting busy times:', error);
      return [];
    }
  }

  findAvailableSlots(busyTimes, startTime, endTime) {
    const slots = [];
    const workStart = this.settings.workingHoursStart;
    const workEnd = this.settings.workingHoursEnd;
    const minimumSlotMinutes = 15;

    let current = new Date(startTime);
    
    while (current < endTime) {
      if (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
        current.setHours(workStart, 0, 0, 0);
        continue;
      }

      const dayStart = new Date(current);
      dayStart.setHours(workStart, 0, 0, 0);
      
      const dayEnd = new Date(current);
      dayEnd.setHours(workEnd, 0, 0, 0);

      const dayBusyTimes = busyTimes.filter(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return busyStart < dayEnd && busyEnd > dayStart;
      }).sort((a, b) => new Date(a.start) - new Date(b.start));

      let slotStart = new Date(dayStart);

      for (const busyTime of dayBusyTimes) {
        const busyStart = new Date(busyTime.start);
        const busyEnd = new Date(busyTime.end);

        if (slotStart < busyStart) {
          const duration = (busyStart - slotStart) / (1000 * 60);
          if (duration >= minimumSlotMinutes) {
            slots.push({
              start: new Date(slotStart),
              end: new Date(busyStart),
              duration: duration
            });
          }
        }

        slotStart = new Date(Math.max(busyEnd, slotStart));
      }

      if (slotStart < dayEnd) {
        const duration = (dayEnd - slotStart) / (1000 * 60);
        if (duration >= minimumSlotMinutes) {
          slots.push({
            start: new Date(slotStart),
            end: new Date(dayEnd),
            duration: duration
          });
        }
      }

      current.setDate(current.getDate() + 1);
      current.setHours(workStart, 0, 0, 0);
    }

    return slots;
  }

  optimizeSchedule(items, availableSlots) {
    const schedule = [];
    const remainingSlots = [...availableSlots];
    const remainingItems = [...items];

    remainingItems.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority] || 2;
      const bPriority = priorityWeight[b.priority] || 2;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      if (a.due && b.due) {
        return new Date(a.due) - new Date(b.due);
      }
      if (a.due) return -1;
      if (b.due) return 1;
      
      return 0;
    });

    for (const item of remainingItems) {
      const suitableSlots = this.findSuitableSlotsForItem(item, remainingSlots);
      
      if (suitableSlots.length === 0) {
        logger.warn(`No suitable slot found for item: ${item.title}`);
        continue;
      }

      const bestSlot = this.selectBestSlot(item, suitableSlots);
      const scheduledItem = this.scheduleItemInSlot(item, bestSlot);
      
      schedule.push(scheduledItem);
      this.updateRemainingSlots(remainingSlots, bestSlot, item.estimatedMinutes);
    }

    return schedule;
  }

  findSuitableSlotsForItem(item, slots) {
    return slots.filter(slot => {
      if (slot.duration < item.estimatedMinutes) return false;

      if (item.targetDate) {
        const slotDate = slot.start.toDateString();
        const targetDate = item.targetDate.toDateString();
        if (slotDate !== targetDate) return false;
      }

      if (item.timePreference) {
        const hour = slot.start.getHours();
        switch (item.timePreference) {
          case 'morning':
            if (hour < 9 || hour > 12) return false;
            break;
          case 'afternoon':
            if (hour < 12 || hour > 17) return false;
            break;
          case 'evening':
            if (hour < 17 || hour > 20) return false;
            break;
        }
      }

      return true;
    });
  }

  selectBestSlot(item, slots) {
    return slots.reduce((best, slot) => {
      let score = 0;

      if (item.timePreference === this.settings.focusTimePreference) {
        score += 10;
      }

      if (item.category === 'coding' || item.category === 'writing') {
        if (this.settings.focusTimePreference === 'morning' && slot.start.getHours() < 12) {
          score += 20;
        }
      }

      const durationFit = Math.min(slot.duration / item.estimatedMinutes, 2);
      score += durationFit * 5;

      return score > (best.score || 0) ? { ...slot, score } : best;
    }, slots[0]);
  }

  scheduleItemInSlot(item, slot) {
    const startTime = new Date(slot.start);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + item.estimatedMinutes);

    return {
      ...item,
      scheduledStart: startTime,
      scheduledEnd: endTime,
      slot: slot
    };
  }

  updateRemainingSlots(slots, usedSlot, usedMinutes) {
    const slotIndex = slots.findIndex(s => s === usedSlot);
    if (slotIndex === -1) return;

    const originalSlot = slots[slotIndex];
    const remainingDuration = originalSlot.duration - usedMinutes;
    
    if (remainingDuration >= 15) {
      const newStart = new Date(originalSlot.start);
      newStart.setMinutes(newStart.getMinutes() + usedMinutes + this.settings.minimumBreakMinutes);
      
      slots[slotIndex] = {
        start: newStart,
        end: new Date(originalSlot.end),
        duration: remainingDuration - this.settings.minimumBreakMinutes
      };
    } else {
      slots.splice(slotIndex, 1);
    }
  }

  async createScheduledEvents(schedule) {
    try {
      const calendars = await this.calendarService.listCalendars();
      const suggestionCalendar = calendars.find(cal => cal.summary === 'AI Coach');
      
      if (!suggestionCalendar) {
        throw new Error('AI Coach calendar not found');
      }

      const userInfo = { email: 'user@example.com' };

      for (const item of schedule) {
        const event = this.calendarService.createTaskEvent(
          item,
          item.scheduledStart,
          item.scheduledEnd,
          userInfo.email
        );

        await this.calendarService.createEvent(suggestionCalendar.id, event);
        logger.info(`Created event: ${item.title}`);
      }
    } catch (error) {
      logger.error('Error creating scheduled events:', error);
      throw error;
    }
  }

  prioritizeItems(items) {
    return items.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority] || 2;
      const bPriority = priorityWeight[b.priority] || 2;
      
      return bPriority - aPriority;
    });
  }
}

export default SchedulingEngine;