const Todo = require('../models/Todo');
const unifiedSmsService = require('./unifiedSmsService');

class ReminderService {
  async checkReminders() {
    try {
      const now = new Date();
      console.log(`[${now.toISOString()}] Checking for reminders...`);

      // Get todos with reminders due in the next 5 minutes
      const upcomingReminders = await Todo.getUpcomingReminders(5);
      
      console.log(`Found ${upcomingReminders.length} reminders to send`);

      let sentCount = 0;
      let failedCount = 0;

      for (const todo of upcomingReminders) {
        try {
          const result = await this.sendReminder(todo);
          
          if (result.success) {
            // Mark as sent in database
            await Todo.findByIdAndUpdate(todo._id, {
              reminderSent: true,
              lastReminderSent: new Date()
            });
            sentCount++;
            console.log(`✅ Reminder sent for: "${todo.title}"`);
          } else {
            failedCount++;
            console.log(`❌ Failed to send reminder for: "${todo.title}" - ${result.error}`);
          }
        } catch (error) {
          failedCount++;
          console.error(`❌ Error sending reminder for todo ${todo._id}:`, error);
        }
      }

      console.log(`Reminder check completed: ${sentCount} sent, ${failedCount} failed`);
      return { sentCount, failedCount, total: upcomingReminders.length };

    } catch (error) {
      console.error('Error in reminder service:', error);
      throw error;
    }
  }

  // ADD THIS METHOD TO FIX THE ERROR
  async checkAndSendReminders() {
    console.log('🔄 Using checkAndSendReminders() - redirecting to checkReminders()');
    return await this.checkReminders();
  }

  async sendReminder(todo) {
    const user = todo.user;
    
    // Check if user has WhatsApp enabled and configured
    if (!user.notificationPreferences?.whatsapp?.enabled) {
      return {
        success: false,
        error: 'WhatsApp notifications not enabled for user',
        serviceUsed: 'none'
      };
    }

    const whatsappSettings = user.notificationPreferences.whatsapp;
    
    if (!whatsappSettings.phoneNumber || !whatsappSettings.apiKey) {
      return {
        success: false,
        error: 'WhatsApp not properly configured for user',
        serviceUsed: 'none'
      };
    }

    try {
      const userPreferences = {
        whatsappEnabled: true,
        whatsappApiKey: whatsappSettings.apiKey
      };

      const result = await unifiedSmsService.sendReminder(
        whatsappSettings.phoneNumber, 
        todo, 
        userPreferences
      );

      return result;

    } catch (error) {
      console.error('Error in sendReminder:', error);
      return {
        success: false,
        error: error.message,
        serviceUsed: 'none'
      };
    }
  }

  async checkOverdueTodos() {
    try {
      const now = new Date();
      console.log(`[${now.toISOString()}] Checking for overdue todos...`);

      const overdueTodos = await Todo.getOverdueTodos();

      let alertedCount = 0;
      let failedCount = 0;

      for (const todo of overdueTodos) {
        // Only send overdue alert once per day
        const lastAlert = todo.lastReminderSent;
        const shouldAlert = !lastAlert || 
          (new Date() - new Date(lastAlert)) > 24 * 60 * 60 * 1000;

        if (shouldAlert) {
          try {
            const result = await this.sendOverdueAlert(todo);
            
            if (result.success) {
              await Todo.findByIdAndUpdate(todo._id, {
                lastReminderSent: new Date()
              });
              alertedCount++;
              console.log(`⚠️ Overdue alert sent for: "${todo.title}"`);
            } else {
              failedCount++;
              console.log(`❌ Failed to send overdue alert for: "${todo.title}"`);
            }
          } catch (error) {
            failedCount++;
            console.error(`❌ Error sending overdue alert for todo ${todo._id}:`, error);
          }
        }
      }

      console.log(`Overdue check completed: ${alertedCount} alerted, ${failedCount} failed`);
      return { alertedCount, failedCount, total: overdueTodos.length };

    } catch (error) {
      console.error('Error checking overdue todos:', error);
      throw error;
    }
  }

  async sendOverdueAlert(todo) {
    const user = todo.user;
    
    // Check if user has WhatsApp enabled and configured
    if (!user.notificationPreferences?.whatsapp?.enabled) {
      return {
        success: false,
        error: 'WhatsApp notifications not enabled for user',
        serviceUsed: 'none'
      };
    }

    const whatsappSettings = user.notificationPreferences.whatsapp;
    
    if (!whatsappSettings.phoneNumber || !whatsappSettings.apiKey) {
      return {
        success: false,
        error: 'WhatsApp not properly configured for user',
        serviceUsed: 'none'
      };
    }

    try {
      const userPreferences = {
        whatsappEnabled: true,
        whatsappApiKey: whatsappSettings.apiKey
      };

      // Create a modified todo for overdue message
      const overdueTodo = {
        ...todo.toObject(),
        isOverdue: true
      };

      const result = await unifiedSmsService.sendReminder(
        whatsappSettings.phoneNumber, 
        overdueTodo, 
        userPreferences
      );

      return result;

    } catch (error) {
      console.error('Error sending overdue alert:', error);
      return {
        success: false,
        error: error.message,
        serviceUsed: 'none'
      };
    }
  }

  // Method to manually trigger a reminder (for testing)
  async sendTestReminder(userId, todoId) {
    try {
      const todo = await Todo.findOne({
        _id: todoId,
        user: userId
      }).populate('user');

      if (!todo) {
        throw new Error('Todo not found');
      }

      return await this.sendReminder(todo);
    } catch (error) {
      console.error('Error sending test reminder:', error);
      throw error;
    }
  }

  // Add this method for status checking
  async getServiceStatus() {
    return {
      isRunning: false,
      lastCheck: new Date(),
      status: 'active'
    };
  }
}

module.exports = new ReminderService();