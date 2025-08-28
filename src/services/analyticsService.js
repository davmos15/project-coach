import logger from '../utils/logger.js';

class AnalyticsService {
  constructor(calendarService, driveService) {
    this.calendarService = calendarService;
    this.driveService = driveService;
    this.learningData = {
      taskEstimates: {},
      categoryPatterns: {},
      timePreferences: {},
      completionPatterns: {},
      energyLevels: {}
    };
  }

  async trackTaskCompletion(task, estimatedDuration, actualDuration, energyLevel = null) {
    try {
      const taskKey = this.generateTaskKey(task);
      const category = task.category || 'general';
      const timeOfDay = this.getTimeOfDay(new Date());

      if (!this.learningData.taskEstimates[taskKey]) {
        this.learningData.taskEstimates[taskKey] = {
          estimates: [],
          actuals: [],
          category,
          title: task.title
        };
      }

      this.learningData.taskEstimates[taskKey].estimates.push(estimatedDuration);
      this.learningData.taskEstimates[taskKey].actuals.push(actualDuration);

      if (!this.learningData.categoryPatterns[category]) {
        this.learningData.categoryPatterns[category] = {
          completions: 0,
          totalEstimated: 0,
          totalActual: 0,
          averageEfficiency: 1.0,
          bestTimeOfDay: {},
          completionRate: 0
        };
      }

      const categoryData = this.learningData.categoryPatterns[category];
      categoryData.completions += 1;
      categoryData.totalEstimated += estimatedDuration;
      categoryData.totalActual += actualDuration;
      categoryData.averageEfficiency = categoryData.totalActual / categoryData.totalEstimated;

      if (!categoryData.bestTimeOfDay[timeOfDay]) {
        categoryData.bestTimeOfDay[timeOfDay] = { count: 0, totalEfficiency: 0 };
      }

      const timeData = categoryData.bestTimeOfDay[timeOfDay];
      timeData.count += 1;
      timeData.totalEfficiency += (actualDuration / estimatedDuration);

      if (energyLevel) {
        const timestamp = new Date().toISOString().split('T')[0];
        this.learningData.energyLevels[timestamp] = {
          level: energyLevel,
          timeOfDay,
          category,
          efficiency: actualDuration / estimatedDuration
        };
      }

      await this.updateLearningConfig();

      logger.info('Task completion tracked', {
        task: taskKey,
        category,
        estimatedDuration,
        actualDuration,
        efficiency: actualDuration / estimatedDuration
      });

    } catch (error) {
      logger.error('Error tracking task completion:', error);
    }
  }

  async trackTaskDeclined(task, reason = 'unknown') {
    try {
      const category = task.category || 'general';
      const timeOfDay = this.getTimeOfDay(new Date());

      if (!this.learningData.categoryPatterns[category]) {
        this.learningData.categoryPatterns[category] = {
          completions: 0,
          declines: 0,
          totalEstimated: 0,
          totalActual: 0,
          averageEfficiency: 1.0,
          bestTimeOfDay: {},
          completionRate: 0
        };
      }

      this.learningData.categoryPatterns[category].declines =
        (this.learningData.categoryPatterns[category].declines || 0) + 1;

      if (!this.learningData.timePreferences[timeOfDay]) {
        this.learningData.timePreferences[timeOfDay] = {
          completions: 0,
          declines: 0,
          categories: {}
        };
      }

      this.learningData.timePreferences[timeOfDay].declines += 1;

      await this.updateLearningConfig();

      logger.info('Task decline tracked', {
        category,
        timeOfDay,
        reason
      });

    } catch (error) {
      logger.error('Error tracking task decline:', error);
    }
  }

  getImprovedEstimate(task) {
    try {
      const taskKey = this.generateTaskKey(task);
      const category = task.category || 'general';

      const taskHistory = this.learningData.taskEstimates[taskKey];
      if (taskHistory && taskHistory.actuals.length > 0) {
        const recentActuals = taskHistory.actuals.slice(-3);
        const averageActual = recentActuals.reduce((sum, val) => sum + val, 0) / recentActuals.length;

        logger.info('Using historical data for estimate', {
          task: taskKey,
          originalEstimate: task.estimatedMinutes,
          improvedEstimate: Math.round(averageActual)
        });

        return Math.round(averageActual);
      }

      const categoryData = this.learningData.categoryPatterns[category];
      if (categoryData && categoryData.averageEfficiency > 0) {
        const adjustedEstimate = Math.round(task.estimatedMinutes * categoryData.averageEfficiency);

        logger.info('Using category-based estimate', {
          category,
          originalEstimate: task.estimatedMinutes,
          efficiency: categoryData.averageEfficiency,
          improvedEstimate: adjustedEstimate
        });

        return adjustedEstimate;
      }

      return task.estimatedMinutes || 45;

    } catch (error) {
      logger.error('Error getting improved estimate:', error);
      return task.estimatedMinutes || 45;
    }
  }

  getBestTimeForCategory(category) {
    try {
      const categoryData = this.learningData.categoryPatterns[category];
      if (!categoryData || !categoryData.bestTimeOfDay) {
        return null;
      }

      let bestTime = null;
      let bestEfficiency = 0;

      for (const [timeOfDay, data] of Object.entries(categoryData.bestTimeOfDay)) {
        if (data.count >= 2) {
          const avgEfficiency = data.totalEfficiency / data.count;
          if (avgEfficiency > bestEfficiency) {
            bestEfficiency = avgEfficiency;
            bestTime = timeOfDay;
          }
        }
      }

      return bestTime;

    } catch (error) {
      logger.error('Error getting best time for category:', error);
      return null;
    }
  }

  getProductivityInsights() {
    try {
      const insights = [];

      const categories = Object.entries(this.learningData.categoryPatterns)
        .sort(([,a], [,b]) => b.completions - a.completions);

      if (categories.length > 0) {
        const topCategory = categories[0];
        insights.push({
          type: 'productivity',
          message: `Your most productive category is ${topCategory[0]} with ${topCategory[1].completions} completed tasks`,
          data: topCategory[1]
        });
      }

      const timePrefs = this.analyzeTimePreferences();
      if (timePrefs) {
        insights.push({
          type: 'timing',
          message: `You're most productive during ${timePrefs.bestTime} with ${Math.round(timePrefs.efficiency * 100)}% efficiency`,
          data: timePrefs
        });
      }

      const estimateAccuracy = this.analyzeEstimateAccuracy();
      if (estimateAccuracy) {
        insights.push({
          type: 'estimation',
          message: `Your time estimates are ${Math.round(estimateAccuracy.accuracy * 100)}% accurate on average`,
          data: estimateAccuracy
        });
      }

      return insights;

    } catch (error) {
      logger.error('Error generating productivity insights:', error);
      return [];
    }
  }

  analyzeTimePreferences() {
    try {
      const timeData = {};

      for (const [, data] of Object.entries(this.learningData.categoryPatterns)) {
        for (const [timeOfDay, timeInfo] of Object.entries(data.bestTimeOfDay || {})) {
          if (!timeData[timeOfDay]) {
            timeData[timeOfDay] = { count: 0, totalEfficiency: 0 };
          }
          timeData[timeOfDay].count += timeInfo.count;
          timeData[timeOfDay].totalEfficiency += timeInfo.totalEfficiency;
        }
      }

      let bestTime = null;
      let bestEfficiency = 0;

      for (const [timeOfDay, data] of Object.entries(timeData)) {
        if (data.count >= 3) {
          const avgEfficiency = data.totalEfficiency / data.count;
          if (avgEfficiency > bestEfficiency) {
            bestEfficiency = avgEfficiency;
            bestTime = timeOfDay;
          }
        }
      }

      return bestTime ? { bestTime, efficiency: bestEfficiency } : null;

    } catch (error) {
      logger.error('Error analyzing time preferences:', error);
      return null;
    }
  }

  analyzeEstimateAccuracy() {
    try {
      let totalEstimates = 0;
      let totalActuals = 0;
      let taskCount = 0;

      for (const taskData of Object.values(this.learningData.taskEstimates)) {
        for (let i = 0; i < Math.min(taskData.estimates.length, taskData.actuals.length); i++) {
          totalEstimates += taskData.estimates[i];
          totalActuals += taskData.actuals[i];
          taskCount++;
        }
      }

      if (taskCount === 0) return null;

      const accuracy = Math.min(totalEstimates / totalActuals, totalActuals / totalEstimates);

      return {
        accuracy,
        averageEstimate: totalEstimates / taskCount,
        averageActual: totalActuals / taskCount,
        taskCount
      };

    } catch (error) {
      logger.error('Error analyzing estimate accuracy:', error);
      return null;
    }
  }

  async updateLearningConfig() {
    try {
      const config = await this.driveService.getConfigFile();

      if (!config.learning_data) {
        config.learning_data = {};
      }

      config.learning_data = {
        ...config.learning_data,
        ...this.learningData,
        lastUpdated: new Date().toISOString()
      };

      await this.driveService.updateConfigFile(config);

    } catch (error) {
      logger.error('Error updating learning config:', error);
    }
  }

  async loadLearningData() {
    try {
      const config = await this.driveService.getConfigFile();

      if (config.learning_data) {
        this.learningData = {
          ...this.learningData,
          ...config.learning_data
        };
        logger.info('Loaded existing learning data');
      }

    } catch (error) {
      logger.error('Error loading learning data:', error);
    }
  }

  generateTaskKey(task) {
    const title = (task.title || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
    const category = task.category || 'general';
    return `${category}_${title.substring(0, 20)}`;
  }

  getTimeOfDay(date) {
    const hour = date.getHours();

    if (hour >= 6 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 17) {
      return 'afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'evening';
    } else {
      return 'night';
    }
  }
}

export default AnalyticsService;