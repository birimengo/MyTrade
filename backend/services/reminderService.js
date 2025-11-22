// services/reminderService.js
const Todo = require('../models/Todo');
const User = require('../models/User');
const whatsappService = require('./whatsappService');

class ReminderService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.init();
  }

  init() {
    console.log('🔄 Initializing Reminder Service...');
    
    // Use setInterval instead of node-cron
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        console.log('⏳ Reminder service already running, skipping...');
        return;
      }
      
      this.isRunning = true;
      try {
        await this.checkAndSendReminders();
      } catch (error) {
        console.error('❌ Error in reminder service:', error);
      } finally {
        this.isRunning = false;
      }
    }, 60000); // Check every minute

    // Additional check every 5 minutes for any missed reminders
    setInterval(async () => {
      try {
        await this.checkMissedReminders();
      } catch (error) {
        console.error('❌ Error in missed reminders check:', error);
      }
    }, 300000); // Check every 5 minutes

    console.log('✅ Reminder Service Started - Running every minute');
  }

  async checkAndSendReminders() {
    const now = new Date();
    console.log(`\n🔔 [${now.toISOString()}] Checking for reminders...`);

    try {
      // Get todos that need reminders
      const pendingReminders = await Todo.getPendingReminders();
      
      console.log(`📋 Found ${pendingReminders.length} pending reminders`);

      let whatsappSent = 0;
      let whatsappFailed = 0;
      let regularSent = 0;

      for (const todo of pendingReminders) {
        try {
          // Check if this is a WhatsApp reminder
          if (todo.shouldSendWhatsAppReminder() && todo.user && todo.user.hasWhatsAppEnabled()) {
            const result = await this.sendWhatsAppReminder(todo);
            
            if (result.success) {
              await todo.markWhatsAppReminderSent();
              await todo.user.updateWhatsAppStats(true);
              whatsappSent++;
              console.log(`✅ WhatsApp reminder sent for: "${todo.title}"`);
            } else {
              whatsappFailed++;
              await todo.user.updateWhatsAppStats(false, result.error);
              console.log(`❌ WhatsApp failed for: "${todo.title}" - ${result.error}`);
            }
          }
          
          // Check if this is a regular reminder (for other notification methods)
          if (todo.shouldSendReminder()) {
            // Here you can add email, push notifications, etc.
            await todo.markReminderSent();
            regularSent++;
            console.log(`📧 Regular reminder sent for: "${todo.title}"`);
          }

        } catch (error) {
          console.error(`💥 Error processing reminder for todo ${todo._id}:`, error);
        }
      }

      console.log(`📊 Reminder Summary:
        ✅ WhatsApp Sent: ${whatsappSent}
        ❌ WhatsApp Failed: ${whatsappFailed}
        📧 Regular Sent: ${regularSent}
        📝 Total Processed: ${pendingReminders.length}
      `);

    } catch (error) {
      console.error('💥 Error in checkAndSendReminders:', error);
      throw error;
    }
  }

  async sendWhatsAppReminder(todo) {
    const user = todo.user;
    
    if (!user || !user.hasWhatsAppEnabled()) {
      return {
        success: false,
        error: 'User not found or WhatsApp not enabled',
        serviceUsed: 'none'
      };
    }

    try {
      const whatsappSettings = user.getWhatsAppSettings();
      const message = this.formatWhatsAppMessage(todo);
      
      const result = await whatsappService.sendMessage(
        whatsappSettings.phoneNumber,
        message,
        whatsappSettings.apiKey
      );

      return {
        success: result.success,
        error: result.error,
        serviceUsed: 'whatsapp',
        messageId: result.messageId
      };

    } catch (error) {
      console.error('💥 Error in sendWhatsAppReminder:', error);
      return {
        success: false,
        error: error.message,
        serviceUsed: 'whatsapp'
      };
    }
  }

  formatWhatsAppMessage(todo) {
    const dueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'No due date set';
    
    const priorityEmoji = {
      'low': '🔵',
      'medium': '🟡', 
      'high': '🟠',
      'urgent': '🔴'
    }[todo.priority] || '⚪';

    return `🔔 *TODO REMINDER*

*Task:* ${todo.title}
${todo.description ? `*Description:* ${todo.description}\n` : ''}
*Due:* ${dueDate}
*Priority:* ${priorityEmoji} ${todo.priority.toUpperCase()}
*Category:* ${todo.category}
*Status:* ${todo.status.replace('-', ' ').toUpperCase()}

⏰ Reminder sent: ${new Date().toLocaleString()}

Mark as completed in your TODO app! ✅`;
  }

  async checkMissedReminders() {
    console.log('🔍 Checking for missed reminders...');
    
    try {
      // Find reminders that should have been sent but weren't (last 30 minutes)
      const cutoffTime = new Date(Date.now() - 30 * 60 * 1000);
      
      const missedReminders = await Todo.find({
        reminderDate: { 
          $lte: cutoffTime,
          $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
        },
        $or: [
          { reminderSent: false },
          { whatsappReminderSent: false }
        ],
        status: { $in: ['pending', 'in-progress'] }
      }).populate('user');

      console.log(`📋 Found ${missedReminders.length} potentially missed reminders`);

      for (const todo of missedReminders) {
        try {
          // Only send WhatsApp for missed reminders if user has it enabled
          if (!todo.whatsappReminderSent && todo.user && todo.user.hasWhatsAppEnabled()) {
            const result = await this.sendWhatsAppReminder(todo);
            
            if (result.success) {
              await todo.markWhatsAppReminderSent();
              console.log(`✅ Sent missed WhatsApp reminder for: "${todo.title}"`);
            }
          }
        } catch (error) {
          console.error(`❌ Error sending missed reminder for ${todo._id}:`, error);
        }
      }

    } catch (error) {
      console.error('💥 Error in checkMissedReminders:', error);
    }
  }

  async sendTestReminder(userId, todoId = null) {
    try {
      let todo;
      
      if (todoId) {
        // Send reminder for specific todo
        todo = await Todo.findOne({
          _id: todoId,
          user: userId
        }).populate('user');
        
        if (!todo) {
          throw new Error('Todo not found');
        }
      } else {
        // Create a test todo
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        todo = new Todo({
          title: "TEST REMINDER - " + new Date().toLocaleTimeString(),
          description: "This is a test reminder to verify WhatsApp integration",
          category: "general",
          priority: "high",
          status: "pending",
          dueDate: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          reminderDate: new Date(),
          user: userId
        });

        await todo.save();
        await todo.populate('user');
      }

      console.log(`🧪 Sending test reminder for user: ${todo.user.email}`);
      
      const result = await this.sendWhatsAppReminder(todo);
      
      if (result.success && !todoId) {
        // Clean up test todo
        await Todo.findByIdAndDelete(todo._id);
      }

      return result;

    } catch (error) {
      console.error('💥 Error in sendTestReminder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getServiceStatus() {
    const now = new Date();
    const pendingCount = await Todo.countDocuments({
      reminderDate: { $lte: now },
      $or: [
        { reminderSent: false },
        { whatsappReminderSent: false }
      ],
      status: { $in: ['pending', 'in-progress'] }
    });

    return {
      isRunning: this.isRunning,
      lastCheck: now,
      pendingReminders: pendingCount,
      nextCheck: new Date(now.getTime() + 60000) // 1 minute from now
    };
  }

  // Cleanup method to stop intervals
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Create and export singleton instance
const reminderService = new ReminderService();
module.exports = reminderService;