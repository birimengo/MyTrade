import React, { useState, useRef } from 'react';
import { FaPaperPlane, FaMicrophone, FaPaperclip, FaTimes, FaFile, FaImage } from 'react-icons/fa';
import VoiceRecorder from './VoiceRecorder';

const MessageInput = ({ onSendMessage, onTyping, onRecording, onFileUpload, onVoiceMessage, isMobile = false }) => {
  const [message, setMessage] = useState('');
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      // Notify that typing has stopped
      if (onTyping) onTyping(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    
    // Handle typing indicators
    if (onTyping) {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Notify typing started
      if (value.trim() && !typingTimeoutRef.current) {
        onTyping(true);
      }
      
      // Set timeout to notify typing stopped
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
        typingTimeoutRef.current = null;
      }, 1000);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 15MB)
      if (file.size > 15 * 1024 * 1024) {
        alert('File size must be less than 15MB');
        return;
      }
      
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed',
        'audio/webm',
        'audio/mpeg',
        'audio/wav'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('File type not allowed. Please upload images, documents, or audio files only.');
        return;
      }
      
      // Handle audio files separately
      if (file.type.startsWith('audio/')) {
        if (onVoiceMessage) {
          onVoiceMessage(file);
        }
        return;
      }
      
      setSelectedFile(file);
      setShowFileUploader(true);
    }
  };

  const handleFileUpload = async () => {
    if (selectedFile && onFileUpload) {
      setUploading(true);
      try {
        await onFileUpload(selectedFile);
        setSelectedFile(null);
        setShowFileUploader(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setShowFileUploader(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVoiceRecordingComplete = (audioBlob) => {
    if (onVoiceMessage) {
      // Convert blob to file
      const audioFile = new File([audioBlob], 'voice-message.webm', {
        type: 'audio/webm'
      });
      onVoiceMessage(audioFile);
    }
    setShowVoiceRecorder(false);
  };

  const toggleVoiceRecorder = () => {
    setShowVoiceRecorder(!showVoiceRecorder);
    if (onRecording) {
      onRecording(!showVoiceRecorder);
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <FaImage className="text-blue-500" />;
    }
    return <FaFile className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // NEW: Responsive sizes
  const padding = isMobile ? 'p-1' : 'p-2';
  const buttonSize = isMobile ? 'p-1.5' : 'p-2';
  const iconSize = isMobile ? 'text-xs' : 'text-sm';
  const inputSize = isMobile ? 'p-1.5 text-xs' : 'p-1.5 text-sm';

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <VoiceRecorder 
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={() => setShowVoiceRecorder(false)}
          isMobile={isMobile}
        />
      )}

      {/* File Uploader */}
      {showFileUploader && selectedFile && (
        <div className={`${padding} border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700`}>
          <div className="flex items-center space-x-3">
            <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gray-200 dark:bg-gray-600 rounded-lg`}>
              {getFileIcon(selectedFile)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-900 dark:text-white truncate`}>
                {selectedFile.name}
              </p>
              <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400`}>
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-1 text-red-500 hover:text-red-700"
              disabled={uploading}
            >
              <FaTimes className={iconSize} />
            </button>
            <button
              onClick={handleFileUpload}
              className={`bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'}`}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSubmit} className={padding}>
        <div className={`flex ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
          {/* Voice Message Button */}
          <button
            type="button"
            onClick={toggleVoiceRecorder}
            className={`${buttonSize} rounded-md ${
              showVoiceRecorder 
                ? 'bg-red-500 text-white' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <FaMicrophone className={iconSize} />
          </button>

          {/* File Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`${buttonSize} text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`}
          >
            <FaPaperclip className={iconSize} />
          </button>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.webm,.mp3,.wav"
          />

          {/* Message Input */}
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className={`flex-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${inputSize}`}
            disabled={showVoiceRecorder}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim() || showVoiceRecorder}
            className={`${buttonSize} bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
          >
            <FaPaperPlane className={iconSize} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;