// backend/services/userSetupService.js
class UserSetupService {
  getWhatsAppSetupInstructions(user) {
    const instructions = {
      title: "WhatsApp Notification Setup",
      steps: [
        {
          step: 1,
          title: "Add CallMeBot to Contacts",
          description: `Add this phone number to your phone contacts:`,
          details: "+34 694 29 84 96",
          action: "save_contact",
          contactName: "CallMeBot Notifications"
        },
        {
          step: 2,
          title: "Send Activation Message",
          description: "Send this exact message to the contact you just created:",
          details: "I allow callmebot to send me messages",
          action: "send_whatsapp",
          message: "I allow callmebot to send me messages"
        },
        {
          step: 3,
          title: "Wait for API Key",
          description: "Wait to receive an API key from the bot (usually within 2 minutes)",
          details: "The message will look like: 'API Activated for your phone number. Your APIKEY is 123123'",
          action: "wait_for_key"
        },
        {
          step: 4,
          title: "Save API Key in App",
          description: "Enter the received API key in your app settings",
          action: "save_apikey",
          field: "whatsappApiKey"
        }
      ],
      troubleshooting: [
        "If you don't receive the API key within 2 minutes, wait 24 hours and try again",
        "Make sure you're using the exact phone number: +34 694 29 84 96",
        "Send the exact message: 'I allow callmebot to send me messages'",
        "Ensure you have a stable internet connection"
      ]
    };

    return instructions;
  }

  // Method to validate user's API key
  async validateUserApiKey(phoneNumber, apiKey) {
    try {
      const testMessage = "🔔 TradeHub Test: Your WhatsApp notifications are working correctly!";
      const encodedMessage = encodeURIComponent(testMessage);
      
      const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber.replace(/\D/g, '')}&text=${encodedMessage}&apikey=${apiKey}`;
      
      const result = await this.makeHttpRequest(url);
      
      return {
        valid: result.success,
        message: result.success ? 
          "API key validated successfully! You will receive a test message." : 
          "Invalid API key. Please check and try again.",
        details: result
      };
    } catch (error) {
      return {
        valid: false,
        message: "Validation failed. Please check your API key and try again.",
        error: error.message
      };
    }
  }

  // Helper method for HTTP requests
  makeHttpRequest(url) {
    return new Promise((resolve) => {
      const https = require('https');
      const { URL } = require('url');
      
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        timeout: 30000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            data: data
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout'
        });
      });

      req.end();
    });
  }
}

module.exports = new UserSetupService();