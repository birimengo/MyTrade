// scripts/check-server.js
const https = require('https');

const checkServer = async () => {
  try {
    console.log('🔍 Checking if backend server is running...');
    
    const response = await fetch('http://localhost:5000/api/health');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is running:', data.message);
      console.log('📅 Server time:', data.timestamp);
      return true;
    } else {
      console.log('❌ Server responded with status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to server:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure your backend server is running: npm run dev (in backend directory)');
    console.log('2. Check if port 5000 is available: netstat -an | grep 5000');
    console.log('3. Try restarting the server');
    return false;
  }
};

// Run the check
checkServer().then(isRunning => {
  if (!isRunning) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});