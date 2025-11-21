// src/components/ChatComponents/DesktopChatScreen.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  FaPaperPlane, 
  FaImage, 
  FaFile, 
  FaCheck, 
  FaExclamationTriangle,
  FaClock,
  FaTimes,
  FaPaperclip,
  FaUser,
  FaWifi,
  FaCloud,
  FaRegSmile,
  FaEllipsisV
} from 'react-icons/fa';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

const DesktopChatScreen = ({ selectedUser, isDarkMode, connectionStatus, onReconnect }) => {
  const { user, token } = useAuth();
  const { socket, sendMessage, joinConversation, leaveConversation, typingUsers, setTyping, onlineUsers } = useSocket();
  
  // State management
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImageSelection, setShowImageSelection] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const initializationRef = useRef(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Memoized values
  const participant = useMemo(() => {
    if (conversation?.participants) {
      return conversation.participants.find(p => 
        p._id !== user._id || (typeof p === 'string' && p !== user._id)
      );
    }
    return selectedUser;
  }, [conversation, user?._id, selectedUser]);

  const isUserTyping = useMemo(() => {
    return conversationId && (typingUsers[conversationId] || []).length > 0;
  }, [conversationId, typingUsers]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Auto-resize textarea
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 60) + 'px';
    }
  };

  // Get or create conversation
  const getOrCreateConversation = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/conversations`, {
        params: { 
          userId: user._id,
          page: 1,
          limit: 50
        },
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        const existingConversation = response.data.conversations.find(conv => 
          conv.participants?.some(participant => 
            participant._id === selectedUser._id || participant === selectedUser._id
          )
        );

        if (existingConversation) {
          return existingConversation;
        }
      }

      // Create new conversation
      const createResponse = await axios.post(`${API_BASE_URL}/api/conversations`, {
        participantId: selectedUser._id,
        userId: user._id
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (createResponse.data?.success) {
        return createResponse.data.conversation;
      }

      throw new Error('Failed to create conversation');
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      setError('Failed to start conversation');
      return null;
    }
  };

  // Fetch messages
  const fetchMessages = async (convId) => {
    if (!convId) {
      console.error('No conversation ID provided');
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_BASE_URL}/api/conversations/${convId}/messages`, {
        params: { 
          userId: user._id,
          page: 1,
          limit: 50
        },
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        return response.data.messages || [];
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Initialize chat with real data
  const initializeChat = useCallback(async () => {
    if (initializationRef.current) return;
    
    try {
      initializationRef.current = true;
      setLoading(true);
      
      const conversationData = await getOrCreateConversation();
      if (!conversationData) {
        throw new Error('Could not create or find conversation');
      }
      
      setConversation(conversationData);
      setConversationId(conversationData._id);
      
      const messagesData = await fetchMessages(conversationData._id);
      setMessages(messagesData);
      
    } catch (error) {
      console.error('Error initializing chat:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      initializationRef.current = false;
    }
  }, [selectedUser, user?._id, token]);

  // Socket event handlers
  useEffect(() => {
    if (socket && conversationId) {
      joinConversation(conversationId);

      const handleMessage = (msg) => {
        if (msg.conversationId === conversationId) {
          setMessages(prev => {
            const messageExists = prev.some(m => m._id === msg._id);
            if (messageExists) return prev;
            
            const newMessages = [...prev, msg];
            return newMessages;
          });
          
          setTimeout(scrollToBottom, 100);
        }
      };

      const handleTyping = (data) => {
        // Typing indicator handled by memoized value
      };

      const handleError = (error) => {
        console.error('Socket error:', error);
      };

      socket.on('message', handleMessage);
      socket.on('typing', handleTyping);
      socket.on('error', handleError);

      return () => {
        leaveConversation(conversationId);
        socket.off('message', handleMessage);
        socket.off('typing', handleTyping);
        socket.off('error', handleError);
      };
    }
  }, [socket, conversationId]);

  // File upload function
  const uploadFile = async (file, isMultiple = false) => {
    const uploadId = `upload_${Date.now()}`;
    
    try {
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);
      formData.append('senderId', user._id);

      const response = await axios.post(`${API_BASE_URL}/api/messages/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total ? 
            (progressEvent.loaded / progressEvent.total) * 100 : 0;
          setUploadProgress(prev => ({ ...prev, [uploadId]: progress }));
        },
        timeout: 30000,
      });

      if (response.data?.success) {
        const serverMessage = response.data.message;
        
        setMessages(prev => {
          const messageExists = prev.some(m => m._id === serverMessage._id);
          if (messageExists) return prev;
          
          const newMessages = [...prev, serverMessage];
          return newMessages;
        });
        
        setTimeout(scrollToBottom, 100);
      } else {
        throw new Error('Upload failed');
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Failed to upload file');
    } finally {
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });
      }, 1000);
    }
  };

  // Upload multiple images
  const uploadMultipleImages = async (files) => {
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i], true);
    }
    
    setSelectedImages([]);
    setShowImageSelection(false);
  };

  // Send text message via socket or API
  const sendMessageViaSocketOrAPI = async (messageData) => {
    const tempId = `local-${Date.now()}`;
    
    try {
      const tempMessage = { 
        ...messageData, 
        _id: tempId,
        status: 'pending',
        senderId: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          businessName: user.businessName
        },
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      if (messageData.type === 'text') {
        setTyping(conversationId, false);
      }

      if (connectionStatus === 'connected') {
        await sendMessage(messageData);
        
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempId ? { ...msg, status: 'sent' } : msg
          )
        );
      } else {
        throw new Error('No connection - cannot send message');
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
      setError('Failed to send message');
    }
  };

  // File input handler
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      if (files.length === 1 && files[0].type.startsWith('image/')) {
        setSelectedImages(files);
        setShowImageSelection(true);
      } else {
        files.forEach(file => uploadFile(file));
      }
    }
    event.target.value = '';
  };

  // Typing handler with debounce
  const handleInputChange = (text) => {
    setInput(text);
    autoResizeTextarea();
    
    if (conversationId) {
      setTyping(conversationId, true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(conversationId, false);
      }, 2000);
    }
  };

  // Send text message
  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;

    const messageData = {
      conversationId: conversationId,
      senderId: user._id,
      content: input.trim(),
      type: 'text',
    };

    await sendMessageViaSocketOrAPI(messageData);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleRetry = () => {
    setError(null);
    initializationRef.current = false;
    initializeChat();
  };

  // Utility functions
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;

    messages.forEach(message => {
      const messageDate = formatDate(message.createdAt);
      
      if (messageDate !== currentDate) {
        groups.push({
          type: 'date',
          date: messageDate,
          id: `date-${messageDate}`
        });
        currentDate = messageDate;
      }
      
      groups.push({
        type: 'message',
        ...message
      });
    });

    return groups;
  }, [messages]);

  // Render message content
  const renderMessageContent = (item) => {
    const isMyMessage = item.senderId?._id === user._id || item.senderId === user._id;

    switch (item.type) {
      case 'image':
        return (
          <div
            className="cursor-pointer"
            onClick={() => setImagePreview(item.fileUrl)}
          >
            <img 
              src={item.fileUrl} 
              alt="Shared image"
              className="max-w-[180px] max-h-[120px] rounded object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="max-w-[180px] max-h-[120px] rounded bg-gray-200 dark:bg-gray-700 hidden items-center justify-center">
              <FaImage className="text-gray-400 text-sm" />
            </div>
          </div>
        );

      default:
        return (
          <p className={`leading-relaxed text-xs ${isMyMessage ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
            {item.content}
          </p>
        );
    }
  };

  // Render date separator
  const renderDateSeparator = (dateItem) => (
    <div key={dateItem.id} className="flex justify-center my-2">
      <div className={`px-2 py-0.5 rounded text-xs font-medium ${
        isDarkMode 
          ? 'bg-gray-700 text-gray-300' 
          : 'bg-gray-200 text-gray-600'
      }`}>
        {dateItem.date}
      </div>
    </div>
  );

  // Render message item
  const renderMessage = (item) => {
    const isMyMessage = item.senderId?._id === user._id || item.senderId === user._id;
    
    return (
      <div
        key={item._id}
        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-1 max-w-[85%] ${
          isMyMessage ? 'ml-auto' : 'mr-auto'
        }`}
      >
        <div className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'} gap-0.5`}>
          {!isMyMessage && (
            <span className={`text-xs px-1.5 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {item.senderId?.firstName}
            </span>
          )}
          
          <div
            className={`px-2.5 py-1.5 rounded-xl ${
              isMyMessage 
                ? 'bg-blue-500 text-white rounded-br-sm' 
                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-600'
            } ${item.type !== 'text' ? 'p-1.5' : ''}`}
          >
            {renderMessageContent(item)}
          </div>
          
          <div className="flex items-center gap-0.5 px-1.5">
            <span className={`text-xs ${isMyMessage ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
              {formatTime(item.createdAt)}
            </span>
            {isMyMessage && (
              <>
                {item.status === 'pending' && <FaClock size={7} className="text-blue-200 animate-pulse" />}
                {item.status === 'sent' && <FaCheck size={7} className="text-blue-200" />}
                {item.status === 'failed' && (
                  <FaExclamationTriangle 
                    size={7} 
                    className="text-red-300 cursor-pointer hover:text-red-200 transition-colors"
                    onClick={handleRetry}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Cleanup effects
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedUser && user?._id && token) {
      initializeChat();
    }

    return () => {
      initializationRef.current = false;
    };
  }, [selectedUser, user?._id, token, initializeChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAvatarText = (user) => {
    if (!user) return '??';
    const firstNameChar = user.firstName ? user.firstName.charAt(0) : '?';
    const lastNameChar = user.lastName ? user.lastName.charAt(0) : '?';
    return (firstNameChar + lastNameChar).toUpperCase();
  };

  // Loading state
  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-1.5"></div>
          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
            Loading conversation...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex-1 flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center max-w-md mx-4">
          <div className="w-10 h-10 mx-auto mb-2 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <FaExclamationTriangle className="text-red-500 text-sm" />
          </div>
          <h3 className={`text-sm font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Connection Issue
          </h3>
          <p className={`text-xs mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <div className="flex gap-1.5 justify-center">
            <button
              onClick={handleRetry}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                isDarkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header - Ultra Compact */}
      <div className={`px-3 py-1.5 border-b ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs ${
              isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              {getAvatarText(participant)}
            </div>
            <div>
              <h3 className={`font-semibold text-xs ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {participant?.businessName || `${participant?.firstName} ${participant?.lastName}` || 'User'}
              </h3>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {participant?.role || 'User'}
                </span>
                <div className={`w-1 h-1 rounded-full ${
                  onlineUsers.includes(participant?._id) 
                    ? 'bg-green-500' 
                    : 'bg-gray-500'
                }`} />
                <span className={`text-xs ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  {onlineUsers.includes(participant?._id) ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {connectionStatus !== 'connected' && (
        <div className={`px-2 py-1 border-b ${
          isDarkMode 
            ? 'bg-yellow-900/20 border-yellow-800 text-yellow-300' 
            : 'bg-yellow-100 border-yellow-200 text-yellow-800'
        }`}>
          <div className="flex items-center gap-1.5">
            <FaCloud className="text-xs animate-pulse" />
            <span className="text-xs">
              Connecting...
            </span>
          </div>
        </div>
      )}

      {/* Messages Container - Reduced Height with Padding */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ 
          height: 'calc(100vh - 200px)', // Reduced height
          minHeight: '150px', // Reduced minimum height
          maxHeight: 'calc(100vh - 200px)' // Reduced maximum height
        }}
      >
        <div className="max-w-4xl mx-auto h-full">
          <div className="flex flex-col p-3 h-full"> {/* Added padding here */}
            {groupedMessages.map(item => 
              item.type === 'date' ? renderDateSeparator(item) : renderMessage(item)
            )}
            
            {isUserTyping && (
              <div className="flex justify-start max-w-[85%] mb-1">
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs px-1.5 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {participant?.firstName}
                  </span>
                  <div className="bg-white dark:bg-gray-700 px-2.5 py-1.5 rounded-xl rounded-bl-sm border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="flex space-x-0.5">
                        <div className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className={`text-xs italic ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        typing...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {messages.length === 0 && !loading && (
            <div className={`flex flex-col items-center justify-center h-full text-center p-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <div className="w-8 h-8 mb-1 opacity-50">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xs">No messages yet</p>
              <p className="text-xs mt-0.5 opacity-75">
                Start a conversation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="px-2 py-0.5 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
          <div className="max-w-4xl mx-auto space-y-0.5">
            {Object.keys(uploadProgress).map(uploadId => (
              <div key={uploadId} className="flex items-center gap-1.5">
                <FaFile className="text-blue-500 text-xs" />
                <div className="flex-1">
                  <div className="h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress[uploadId]}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Uploading {Math.round(uploadProgress[uploadId])}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Container - Ultra Compact */}
      <div className={`px-3 py-2 border-t ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*, .pdf, .doc, .docx, .txt"
              multiple
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-1 rounded ${
                isDarkMode 
                  ? 'text-blue-400 hover:bg-gray-700' 
                  : 'text-blue-600 hover:bg-gray-100'
              }`}
              title="Attach files"
            >
              <FaPaperclip className="text-xs" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                placeholder="Type a message..."
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className={`w-full rounded-lg px-2 py-1 text-xs focus:outline-none resize-none border ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                }`}
                rows={1}
                style={{ minHeight: '32px', maxHeight: '60px' }}
              />
            </div>
            
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`p-1.5 rounded ${
                !input.trim()
                  ? (isDarkMode 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                  : (isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white')
              }`}
            >
              <FaPaperPlane className="text-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Selection Modal - Ultra Compact */}
      {showImageSelection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className={`rounded shadow-lg max-w-sm w-full mx-auto ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`px-3 py-1.5 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-center">
                <h3 className={`font-semibold text-xs ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  Send Images ({selectedImages.length})
                </h3>
                <button
                  onClick={() => {
                    setShowImageSelection(false);
                    setSelectedImages([]);
                  }}
                  className={`p-0.5 rounded ${
                    isDarkMode 
                      ? 'text-gray-400 hover:bg-gray-700' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>
            </div>
            
            <div className="p-2">
              <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-12 object-cover rounded"
                    />
                    <button
                      onClick={() => {
                        setSelectedImages(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="absolute -top-0.5 -right-0.5 p-0.5 bg-red-500 text-white rounded-full text-xs"
                    >
                      <FaTimes size={6} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`px-2 py-1.5 border-t ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setShowImageSelection(false);
                    setSelectedImages([]);
                  }}
                  className={`flex-1 py-1 rounded text-xs ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => uploadMultipleImages(selectedImages)}
                  disabled={selectedImages.length === 0}
                  className={`flex-1 py-1 rounded text-xs ${
                    selectedImages.length === 0
                      ? (isDarkMode 
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                      : (isDarkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white')
                  }`}
                >
                  Send {selectedImages.length}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal - Ultra Compact */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2">
          <div className="relative max-w-xl max-h-[60vh] w-full mx-auto">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded hover:bg-black/70 z-10"
            >
              <FaTimes size={10} />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-contain max-h-[60vh] rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopChatScreen;