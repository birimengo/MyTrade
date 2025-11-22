// services/reminderService.js
const Todo = require('../models/Todo');
const unifiedSmsService = require('./unifiedSmsService');

class ReminderService {
  async checkReminders() {
    try {
      const now = new Date();
      console.log(`[${now.toISOString()}] Checking for reminders...`);

      // Get todos with reminders due in the next 30 minutes
      const upcomingReminders = await Todo.getUpcomingReminders(30);
      
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

  async sendReminder(todo) {
    const user = todo.user;
    
    // Check if user has phone number for SMS/WhatsApp
    if (!user.phoneNumber) {
      return {
        success: false,
        error: 'No phone number available for user',
        serviceUsed: 'none'
      };
    }

    try {
      const userPreferences = {
        whatsappEnabled: true,
        whatsappApiKey: process.env.CALLMEBOT_API_KEY
      };

      const result = await unifiedSmsService.sendReminder(
        user.phoneNumber, 
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

      const overdueTodos = await Todo.getOverdueTodos()
        .populate('user', 'name email phoneNumber');

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
    
    if (!user.phoneNumber) {
      return {
        success: false,
        error: 'No phone number available for user',
        serviceUsed: 'none'
      };
    }

    try {
      const userPreferences = {
        whatsappEnabled: true,
        whatsappApiKey: process.env.CALLMEBOT_API_KEY
      };

      // Create a modified todo for overdue message
      const overdueTodo = {
        ...todo.toObject(),
        isOverdue: true
      };

      const result = await unifiedSmsService.sendReminder(
        user.phoneNumber, 
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
      }).populate('user', 'name email phoneNumber');

      if (!todo) {
        throw new Error('Todo not found');
      }

      return await this.sendReminder(todo);
    } catch (error) {
      console.error('Error sending test reminder:', error);
      throw error;
    }
  }
}

module.exports = new ReminderService();