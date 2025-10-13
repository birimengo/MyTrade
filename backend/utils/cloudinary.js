// backend/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const stream = require('stream');

// Check if CLOUDINARY_URL exists
if (!process.env.CLOUDINARY_URL) {
  console.error('❌ CLOUDINARY_URL environment variable is required');
  console.error('Please add CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME to your .env file');
  process.exit(1);
}

// Parse the Cloudinary URL safely
try {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  console.log('Cloudinary URL:', cloudinaryUrl);
  
  // Extract credentials from the URL
  const matches = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@([^\/]+)/);
  
  if (!matches || matches.length < 4) {
    throw new Error('Invalid Cloudinary URL format');
  }
  
  const apiKey = matches[1];
  const apiSecret = matches[2];
  const cloudName = matches[3];
  
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  
  console.log('✅ Cloudinary configured successfully for cloud:', cloudName);
} catch (error) {
  console.error('❌ Error configuring Cloudinary:', error.message);
  console.error('Please check your CLOUDINARY_URL format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
  process.exit(1);
}

// Use memory storage for multer
const storage = multer.memoryStorage();

// Updated file filter to allow images, documents, and audio files
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type - allow images, documents, and audio files
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', // Images
      'application/pdf', // PDF documents
      'application/msword', // DOC files
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/vnd.ms-excel', // XLS files
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'text/plain', // Text files
      'application/zip', // ZIP archives
      'application/x-rar-compressed', // RAR archives
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg' // Audio files
    ];
    
    // Explicitly reject video files only
    const rejectedTypes = [
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else if (rejectedTypes.includes(file.mimetype)) {
      cb(new Error('Video files are not allowed. Please use voice messages for audio.'), false);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'trade-uganda-chat',
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    // Create a buffer stream
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

// Utility function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

module.exports = { 
  cloudinary, 
  upload, 
  uploadToCloudinary,
  deleteFromCloudinary
};