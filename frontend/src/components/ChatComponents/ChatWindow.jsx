import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import OnlineIndicator from './OnlineIndicator';
import { FaTimes, FaUser, FaArrowLeft, FaSync, FaExclamationTriangle, FaPhone, FaVideo } from 'react-icons/fa';

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
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      
      if (socket) {
        socket.emit('join', conversation._id);
        
        socket.on('message', (message) => {
          console.log('New message received:', message);
          if (message.conversationId === conversation._id) {
            setMessages(prev => [...prev, message]);
          }
        });

        socket.on('typing', (data) => {
          if (data.conversationId === conversation._id) {
            if (data.isTyping) {
              setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
            } else {
              setTypingUsers(prev => prev.filter(id => id !== data.userId));
            }
          }
        });

        socket.on('recording', (data) => {
          if (data.conversationId === conversation._id) {
            if (data.isRecording) {
              setRecordingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
            } else {
              setRecordingUsers(prev => prev.filter(id => id !== data.userId));
            }
          }
        });

        socket.on('onlineUsers', (onlineUserIds) => {
          setOnlineUsers(onlineUserIds || []);
        });

        socket.on('fileUploadProgress', (data) => {
          if (data.conversationId === conversation._id) {
            console.log(`File upload progress: ${data.progress}%`);
          }
        });

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

  // Mobile-responsive dimensions
  const chatHeight = isMobile ? 'min-h-[80vh] h-[80vh]' : 'h-[600px]';
  const messagesHeight = isMobile ? 'h-[calc(80vh-140px)]' : 'h-[calc(100%-120px)]';
  const headerPadding = isMobile ? 'p-3' : 'p-4';
  const messagePadding = isMobile ? 'p-3' : 'p-4';

  if (!conversation) {
    return (
      <div className={`flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow items-center justify-center ${chatHeight}`}>
        <div className="text-center p-8">
          <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-2xl text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Conversation Selected</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Select a user from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow ${chatHeight}`}>
      {/* Header */}
      <div className={`${headerPadding} border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 rounded-t-lg`}>
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {(isEmbedded || isMobile) && (
            <button
              onClick={onToggleMobile || onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FaArrowLeft className="text-base" />
            </button>
          )}
          
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {participant?.businessName?.charAt(0) || participant?.firstName?.charAt(0) || 'U'}
            </div>
            <OnlineIndicator 
              isOnline={isParticipantOnline()} 
              className="-top-1 -right-1"
              size="sm"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base">
                {participant?.businessName || `${participant?.firstName} ${participant?.lastName}`}
              </h3>
              {isParticipantOnline() && (
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400 capitalize">
                {participant?.role}
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className={`font-medium ${isParticipantOnline() ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {isParticipantOnline() ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Call buttons - hidden on mobile to save space */}
          {!isMobile && (
            <>
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <FaPhone className="text-sm" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <FaVideo className="text-sm" />
              </button>
            </>
          )}
          
          <button
            onClick={handleRetry}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh messages"
          >
            <FaSync className={`text-sm ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {!isEmbedded && !isMobile && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FaTimes className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto ${messagePadding} ${messagesHeight}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading messages...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="bg-red-100 dark:bg-red-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <FaExclamationTriangle className="text-xl text-red-500" />
            </div>
            <h4 className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load messages</h4>
            <p className="text-red-500 dark:text-red-300 text-sm mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaUser className="text-2xl text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No messages yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Start a conversation with {participant?.firstName || 'this user'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Send a message to begin chatting
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

      {/* Message Input */}
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