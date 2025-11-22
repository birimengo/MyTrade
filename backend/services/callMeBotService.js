// services/callMeBotService.js
const https = require('https');
const http = require('http');
const { URL } = require('url');

class CallMeBotService {
  async sendWhatsApp(phoneNumber, message, apikey) {
    try {
      console.log(`📱 Attempting to send WhatsApp message to: ${phoneNumber}`);
      console.log(`🔑 Using API Key: ${apikey ? 'Provided' : 'Missing'}`);
      
      // Remove any non-digit characters from phone number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      console.log(`📞 Cleaned phone number: ${cleanPhone}`);
      console.log(`💬 Message: ${message.substring(0, 50)}...`);

      // Build URL with query parameters
      const url = new URL('https://api.callmebot.com/whatsapp.php');
      url.searchParams.append('phone', cleanPhone);
      url.searchParams.append('text', message);
      if (apikey) {
        url.searchParams.append('apikey', apikey);
      }

      const result = await this.makeHttpRequest(url.toString(), 'GET');
      
      if (result.success) {
        console.log('✅ CallMeBot WhatsApp sent successfully');
        console.log('📊 Response:', result.data);
        
        return { 
          success: true, 
          message: 'WhatsApp message sent successfully',
          response: result.data
        };
      } else {
        console.error('❌ CallMeBot error:', result.error);
        return { 
          success: false, 
          error: result.error,
          details: result.data || 'No response details'
        };
      }
    } catch (error) {
      console.error('❌ CallMeBot error:', error.message);
      return { 
        success: false, 
        error: error.message,
        details: 'Request failed'
      };
    }
  }

  async sendTelegram(message, chatId, botToken) {
    try {
      console.log(`📢 Attempting to send Telegram message to chat: ${chatId}`);
      
      const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}&parse_mode=HTML`;
      
      const result = await this.makeHttpRequest(url, 'GET');
      
      if (result.success) {
        console.log('✅ Telegram message sent successfully');
        return { success: true, response: result.data };
      } else {
        console.error('❌ Telegram error:', result.error);
        return { 
          success: false, 
          error: result.error,
          details: result.data
        };
      }
    } catch (error) {
      console.error('❌ Telegram error:', error.message);
      return { 
        success: false, 
        error: error.message
      };
    }
  }

  // Generic HTTP request method without axios
  makeHttpRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          'User-Agent': 'TradeHub-Todo-System/1.0',
          'Accept': 'application/json',
        },
        timeout: 30000 // 30 second timeout
      };

      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = protocol.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            // Try to parse as JSON, if it fails, return as text
            let parsedData;
            try {
              parsedData = JSON.parse(responseData);
            } catch {
              parsedData = responseData;
            }
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                success: true,
                data: parsedData,
                statusCode: res.statusCode,
                headers: res.headers
              });
            } else {
              resolve({
                success: false,
                error: `HTTP ${res.statusCode}: ${res.statusMessage}`,
                data: parsedData,
                statusCode: res.statusCode
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: `Response parsing error: ${error.message}`,
              data: responseData,
              statusCode: res.statusCode
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: `Request failed: ${error.message}`,
          data: null
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout after 30 seconds',
          data: null
        });
      });

      // Send data if provided (for POST requests)
      if (data && method === 'POST') {
        const jsonData = JSON.stringify(data);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Content-Length', Buffer.byteLength(jsonData));
        req.write(jsonData);
      }

      req.end();
    });
  }

  // Enhanced HTTP POST method
  async makePostRequest(url, data) {
    return this.makeHttpRequest(url, 'POST', data);
  }

  // Test method to verify CallMeBot setup
  async testConnection(apiKey) {
    try {
      console.log('🧪 Testing CallMeBot connection...');
      
      // Send a test message to a dummy number (won't actually send without valid number)
      const testResult = await this.sendWhatsApp('1234567890', 'Test connection message from TradeHub Todo System', apiKey);
      
      if (testResult.success) {
        return {
          success: true,
          message: 'CallMeBot connection test successful',
          details: testResult
        };
      } else {
        return {
          success: false,
          message: 'CallMeBot connection test failed',
          error: testResult.error,
          details: testResult
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'CallMeBot connection test failed',
        error: error.message
      };
    }
  }

  // Method to check service status
  async checkServiceStatus() {
    try {
      console.log('🔍 Checking CallMeBot service status...');
      
      const result = await this.makeHttpRequest('https://api.callmebot.com/', 'GET');
      
      return {
        service: 'CallMeBot',
        status: result.success ? 'online' : 'offline',
        responseTime: 'unknown', // We don't measure response time in this simple version
        details: result
      };
    } catch (error) {
      return {
        service: 'CallMeBot',
        status: 'error',
        error: error.message
      };
    }
  }

  // Method to validate phone number format
  validatePhoneNumber(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Basic validation - should be at least 10 digits
    if (cleanPhone.length < 10) {
      return {
        valid: false,
        error: 'Phone number too short',
        cleaned: cleanPhone
      };
    }
    
    // Check if it contains only digits
    if (!/^\d+$/.test(cleanPhone)) {
      return {
        valid: false,
        error: 'Phone number contains invalid characters',
        cleaned: cleanPhone
      };
    }
    
    return {
      valid: true,
      cleaned: cleanPhone,
      formatted: `+${cleanPhone}`
    };
  }

  // Method to validate message content
  validateMessage(message) {
    const maxLength = 4096; // WhatsApp message limit
    
    if (!message || message.trim().length === 0) {
      return {
        valid: false,
        error: 'Message cannot be empty'
      };
    }
    
    if (message.length > maxLength) {
      return {
        valid: false,
        error: `Message too long (${message.length} characters, max ${maxLength})`,
        truncated: message.substring(0, maxLength - 100) + '... [truncated]'
      };
    }
    
    return {
      valid: true,
      length: message.length,
      preview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    };
  }

  // Batch send method (for multiple reminders)
  async sendBatchWhatsApp(messages) {
    try {
      console.log(`📦 Processing batch of ${messages.length} WhatsApp messages...`);
      
      const results = [];
      
      for (let i = 0; i < messages.length; i++) {
        const { phoneNumber, message, apikey } = messages[i];
        
        console.log(`🔄 Sending message ${i + 1}/${messages.length} to ${phoneNumber}`);
        
        const result = await this.sendWhatsApp(phoneNumber, message, apikey);
        results.push({
          index: i,
          phoneNumber,
          success: result.success,
          error: result.error,
          messagePreview: message.substring(0, 50) + '...'
        });
        
        // Add delay between messages to avoid rate limiting
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      console.log(`📊 Batch completed: ${successCount} successful, ${failureCount} failed`);
      
      return {
        success: failureCount === 0,
        total: messages.length,
        successful: successCount,
        failed: failureCount,
        results: results
      };
    } catch (error) {
      console.error('❌ Batch send error:', error);
      return {
        success: false,
        error: error.message,
        total: messages.length,
        successful: 0,
        failed: messages.length,
        results: []
      };
    }
  }

  // Emergency fallback method (if primary fails)
  async sendEmergencySMS(phoneNumber, message, fallbackProvider = 'simulated') {
    try {
      console.log(`🚨 Using emergency SMS fallback for: ${phoneNumber}`);
      console.log(`📱 Provider: ${fallbackProvider}`);
      
      // This is a simulated emergency fallback
      // In a real implementation, you would integrate with an SMS gateway here
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Emergency SMS sent successfully (simulated)');
      
      return {
        success: true,
        method: 'emergency_sms',
        provider: fallbackProvider,
        simulated: true,
        message: 'Emergency SMS sent successfully (simulated)'
      };
    } catch (error) {
      console.error('❌ Emergency SMS failed:', error);
      return {
        success: false,
        method: 'emergency_sms',
        error: error.message,
        simulated: true
      };
    }
  }

  // Get service statistics
  getServiceStats() {
    return {
      service: 'CallMeBot',
      version: '1.0.0',
      features: [
        'WhatsApp messaging',
        'Telegram messaging',
        'Batch sending',
        'Phone number validation',
        'Message validation',
        'Emergency SMS fallback',
        'Service status checking'
      ],
      limits: {
        maxMessageLength: 4096,
        batchDelay: 1000,
        requestTimeout: 30000
      },
      dependencies: {
        axios: 'none',
        https: 'native',
        http: 'native'
      }
    };
  }
}

module.exports = new CallMeBotService();