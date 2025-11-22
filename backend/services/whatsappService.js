// services/whatsappService.js
const https = require('https');
const { URL } = require('url');

class WhatsAppService {
  constructor() {
    this.baseURL = 'https://api.callmebot.com';
  }

  async sendMessage(phoneNumber, message, apiKey) {
    return new Promise((resolve) => {
      try {
        // Clean phone number (remove spaces, plus signs, etc.)
        const cleanPhone = phoneNumber.replace(/[\s\+]/g, '');
        
        // Create URL with query parameters
        const url = new URL(`${this.baseURL}/whatsapp.php`);
        url.searchParams.append('phone', cleanPhone);
        url.searchParams.append('text', message);
        url.searchParams.append('apikey', apiKey);

        console.log(`📤 Sending WhatsApp to: ${cleanPhone}`);
        console.log(`📝 Message: ${message.substring(0, 100)}...`);
        
        const options = {
          method: 'GET',
          timeout: 30000 // 30 second timeout
        };

        const req = https.request(url, options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            console.log(`📨 WhatsApp API Response:`, data);

            // Check response for success indicators
            if (data && typeof data === 'string') {
              const responseText = data.toLowerCase();
              
              if (responseText.includes('message sent') || 
                  responseText.includes('message queued') ||
                  responseText.includes('success')) {
                resolve({
                  success: true,
                  messageId: this.generateMessageId(),
                  response: data
                });
              } else {
                resolve({
                  success: false,
                  error: `API returned: ${data}`,
                  response: data
                });
              }
            } else {
              resolve({
                success: false,
                error: 'Invalid response from WhatsApp API',
                response: data
              });
            }
          });
        });

        req.on('error', (error) => {
          console.error('💥 WhatsApp API Error:', error.message);
          resolve({
            success: false,
            error: error.message,
            response: null
          });
        });

        req.on('timeout', () => {
          console.error('💥 WhatsApp API Timeout');
          req.destroy();
          resolve({
            success: false,
            error: 'Request timeout - check internet connection',
            response: null
          });
        });

        req.end();

      } catch (error) {
        console.error('💥 Error in sendMessage:', error.message);
        resolve({
          success: false,
          error: error.message,
          response: null
        });
      }
    });
  }

  async testConnection(phoneNumber, apiKey, testMessage = null) {
    const message = testMessage || `🔔 Test message from TODO App\nTime: ${new Date().toLocaleString()}\nThis confirms your WhatsApp integration is working! ✅`;
    
    return await this.sendMessage(phoneNumber, message, apiKey);
  }

  generateMessageId() {
    return `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility method to validate phone number format
  validatePhoneNumber(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[\s\+]/g, '');
    
    // Basic validation for international numbers
    const phoneRegex = /^\d{10,15}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      return {
        valid: false,
        error: 'Phone number should be 10-15 digits long'
      };
    }
    
    return {
      valid: true,
      cleaned: cleanPhone
    };
  }

  // Utility method to check API key format
  validateApiKey(apiKey) {
    if (!apiKey || apiKey.length < 10) {
      return {
        valid: false,
        error: 'API key seems too short'
      };
    }
    
    return {
      valid: true
    };
  }
}

// Create and export singleton instance
const whatsappService = new WhatsAppService();
module.exports = whatsappService;