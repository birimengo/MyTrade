// Simple email stub that logs instead of sending emails
const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log('📧 Email would be sent:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', html.substring(0, 200) + '...');
    
    // Return a mock success response
    return { messageId: 'mock-message-id-' + Date.now() };
  } catch (error) {
    console.error('Email simulation failed:', error);
    throw error;
  }
};

module.exports = sendEmail;