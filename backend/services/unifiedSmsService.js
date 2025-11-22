// services/unifiedSmsService.js
const callMeBotService = require('./callMeBotService');

class UnifiedSmsService {
  async sendReminder(phoneNumber, todo, userPreferences = {}) {
    const message = this.formatReminderMessage(todo);
    
    console.log(`📨 Attempting to send reminder to ${phoneNumber}`);
    console.log(`📝 Message: ${message.substring(0, 100)}...`);

    // Try WhatsApp via CallMeBot first
    if (userPreferences.whatsappEnabled && userPreferences.whatsappApiKey) {
      try {
        console.log('🔗 Using WhatsApp via CallMeBot...');
        const result = await callMeBotService.sendWhatsApp(
          phoneNumber, 
          message, 
          userPreferences.whatsappApiKey
        );
        
        if (result.success) {
          console.log('✅ Reminder sent successfully via WhatsApp');
          return { 
            ...result, 
            serviceUsed: 'whatsapp',
            message: 'Reminder sent via WhatsApp'
          };
        } else {
          console.log('❌ WhatsApp sending failed:', result.error);
        }
      } catch (error) {
        console.error('❌ WhatsApp sending error:', error.message);
      }
    } else {
      console.log('⚠️ WhatsApp not enabled or API key missing');
      console.log('📊 Preferences:', {
        whatsappEnabled: userPreferences.whatsappEnabled,
        hasApiKey: !!userPreferences.whatsappApiKey
      });
    }

    // Fallback to other services can be added here
    console.log('❌ All reminder methods failed');
    return { 
      success: false, 
      error: 'WhatsApp reminder failed. User might not have WhatsApp setup or API key is invalid.',
      serviceUsed: 'none'
    };
  }

  formatReminderMessage(todo) {
    const dueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : 'No due date';
    const priorityEmoji = {
      low: '🟢',
      medium: '🟡', 
      high: '🟠',
      urgent: '🔴'
    }[todo.priority] || '⚪';

    let message = '';

    if (todo.isOverdue) {
      message = `🚨 OVERDUE TASK ALERT\n\n`;
      message += `"${todo.title}"\n`;
      message += `📅 Was due: ${dueDate}\n`;
      message += `${priorityEmoji} Priority: ${todo.priority.toUpperCase()}\n`;
      message += `📊 Status: ${todo.status}\n\n`;
      message += `⚠️ This task is overdue! Please complete it as soon as possible.`;
    } else {
      message = `🔔 TASK REMINDER\n\n`;
      message += `"${todo.title}"\n`;
      
      if (todo.description) {
        message += `📝 ${todo.description}\n`;
      }
      
      message += `📅 Due: ${dueDate}\n`;
      message += `${priorityEmoji} Priority: ${todo.priority.toUpperCase()}\n`;
      message += `📊 Status: ${todo.status}\n`;
      
      if (todo.estimatedTime) {
        message += `⏱️ Estimated: ${todo.estimatedTime.value} ${todo.estimatedTime.unit}\n`;
      }
      
      if (todo.tags && todo.tags.length > 0) {
        message += `🏷️ Tags: ${todo.tags.join(', ')}\n`;
      }
      
      message += `\n💡 Don't forget to update your progress!`;
    }

    return message;
  }

  // Test method for the unified service
  async testService(phoneNumber, apiKey) {
    try {
      console.log('🧪 Testing Unified SMS Service...');
      
      const testTodo = {
        title: 'Test Task',
        description: 'This is a test task for service verification',
        dueDate: new Date(),
        priority: 'medium',
        status: 'pending',
        isOverdue: false
      };

      const userPreferences = {
        whatsappEnabled: true,
        whatsappApiKey: apiKey
      };

      const result = await this.sendReminder(phoneNumber, testTodo, userPreferences);
      
      return {
        success: result.success,
        service: 'UnifiedSmsService',
        message: result.success ? 'Service test completed successfully' : 'Service test failed',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        service: 'UnifiedSmsService',
        message: 'Service test failed with error',
        error: error.message
      };
    }
  }
}

module.exports = new UnifiedSmsService();