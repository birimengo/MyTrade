import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import OnlineIndicator from './OnlineIndicator';
import { FaTimes, FaUser, FaArrowLeft, FaSync, FaExclamationTriangle } from 'react-icons/fa';

const ChatWindow = ({ conversation, onClose, socket, isEmbedded = false, onToggleMobile = null }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [recordingUsers, setRecordingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      
      // Join the conversation room
      if (socket) {
        socket.emit('join', conversation._id);
        
        // Listen for new messages
        socket.on('message', (message) => {
          console.log('New message received:', message);
          if (message.conversationId === conversation._id) {
            setMessages(prev => [...prev, message]);
          }
        });

        // Listen for typing indicators
        socket.on('typing', (data) => {
          if (data.conversationId === conversation._id) {
            if (data.isTyping) {
              setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
            } else {
              setTypingUsers(prev => prev.filter(id => id !== data.userId));
            }
          }
        });

        // Listen for recording indicators
        socket.on('recording', (data) => {
          if (data.conversationId === conversation._id) {
            if (data.isRecording) {
              setRecordingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
            } else {
              setRecordingUsers(prev => prev.filter(id => id !== data.userId));
            }
          }
        });

        // Listen for online users updates
        socket.on('onlineUsers', (onlineUserIds) => {
          setOnlineUsers(onlineUserIds || []);
        });

        // Listen for file upload progress
        socket.on('fileUploadProgress', (data) => {
          if (data.conversationId === conversation._id) {
            console.log(`File upload progress: ${data.progress}%`);
          }
        });

        // Listen for audio playback events
        socket.on('audioPlayback', (data) => {
          if (data.conversationId === conversation._id) {
            console.log(`User ${data.userId} is ${data.isPlaying ? 'playing' : 'paused'} audio message ${data.messageId}`);
          }
        });
      }
    }

    return () => {
      if (socket) {
        socket.off('message');
        socket.off('typing');
        socket.off('recording');
        socket.off('onlineUsers');
        socket.off('fileUploadProgress');
        socket.off('audioPlayback');
      }
    };
  }, [conversation, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers, recordingUsers]);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:5000/api/conversations/${conversation._id}/messages?userId=${user._id}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        throw new Error(data.message || 'Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (content) => {
    if (socket && content.trim()) {
      const messageData = {
        conversationId: conversation._id,
        senderId: user._id,
        content: content.trim(),
        type: 'text'
      };
      
      socket.emit('sendMessage', messageData);
    }
  };

  const handleTyping = (isTyping) => {
    if (socket) {
      socket.emit('typing', {
        conversationId: conversation._id,
        isTyping
      });
    }
  };

  const handleRecording = (isRecording) => {
    if (socket) {
      socket.emit('recording', {
        conversationId: conversation._id,
        isRecording
      });
    }
  };

  const handleFileUpload = async (file) => {
    if (!conversation) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversation._id);
      formData.append('senderId', user._id);

      const response = await fetch('http://localhost:5000/api/messages/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to upload file');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleVoiceMessage = async (audioFile) => {
    if (!conversation) return;

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('conversationId', conversation._id);
      formData.append('senderId', user._id);

      const response = await fetch('http://localhost:5000/api/messages/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to upload voice message');
      }

    } catch (error) {
      console.error('Error uploading voice message:', error);
      throw error;
    }
  };

  const handleRetry = () => {
    fetchMessages();
  };

  const getParticipant = () => {
    return conversation.participants.find(p => p._id !== user._id);
  };

  const isParticipantOnline = () => {
    const participant = getParticipant();
    return participant && onlineUsers.includes(participant._id);
  };

  const participant = getParticipant();

  // NEW: Responsive dimensions
  const chatHeight = isMobile ? 'h-[calc(100vh-120px)]' : 'h-[600px]';
  const headerPadding = isMobile ? 'p-2' : 'p-3';
  const messagePadding = isMobile ? 'p-1' : 'p-2';
  const textSize = isMobile ? 'text-xs' : 'text-sm';

  if (!conversation) {
    return (
      <div className={`flex flex-col h-full bg-white dark:bg-gray-800 items-center justify-center ${chatHeight}`}>
        <div className="text-center p-6">
          <FaExclamationTriangle className="mx-auto text-2xl text-yellow-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-300">No conversation selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${chatHeight}`}>
      {/* Header */}
      <div className={`${headerPadding} border-b border-gray-200 dark:border-gray-700 flex items-center`}>
        {(isEmbedded || isMobile) && (
          <button
            onClick={onToggleMobile || onClose}
            className="mr-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <FaArrowLeft className={isMobile ? "text-sm" : "text-sm"} />
          </button>
        )}
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative">
            <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center`}>
              <FaUser className={isMobile ? "text-xs" : "text-xs"} />
            </div>
            <OnlineIndicator 
              isOnline={isParticipantOnline()} 
              className={isMobile ? "-top-0.5 -right-0.5" : "-top-0.5 -right-0.5"}
              size={isMobile ? "xs" : "xs"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-gray-900 dark:text-white truncate ${isMobile ? 'text-sm' : 'text-sm'}`}>
              {participant?.businessName || `${participant?.firstName} ${participant?.lastName}`}
            </h3>
            <p className={`text-gray-500 dark:text-gray-400 capitalize ${isMobile ? 'text-xs' : 'text-xs'}`}>
              {participant?.role}
              {isParticipantOnline() && (
                <span className="text-green-500 ml-1">• Online</span>
              )}
            </p>
          </div>
        </div>
        
        {/* Refresh Button */}
        <button
          onClick={handleRetry}
          disabled={loading}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          title="Refresh messages"
        >
          <FaSync className={`${isMobile ? 'text-xs' : 'text-sm'} ${loading ? 'animate-spin' : ''}`} />
        </button>
        
        {!isEmbedded && !isMobile && (
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <FaTimes className="text-sm" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto ${messagePadding}`}>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <FaExclamationTriangle className="text-2xl text-red-500 mb-2" />
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No messages yet. Start a conversation!
            </p>
          </div>
        ) : (
          <>
            <MessageList 
              messages={messages} 
              currentUserId={user._id} 
              socket={socket}
              conversationId={conversation._id}
              isMobile={isMobile}
            />
            <TypingIndicator 
              typingUsers={typingUsers}
              recordingUsers={recordingUsers}
              participants={conversation.participants}
              currentUserId={user._id}
              isMobile={isMobile}
            />
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        onRecording={handleRecording}
        onFileUpload={handleFileUpload}
        onVoiceMessage={handleVoiceMessage}
        isMobile={isMobile}
      />
    </div>
  );
};

export default ChatWindow;