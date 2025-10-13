// src/components/ChatComponents/ChatScreen.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Keyboard,
  Animated,
  PermissionsAndroid
} from 'react-native';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

// Error tracking utility
const trackError = (errorType, error, additionalData = {}) => {
  console.error(`[ERROR:${errorType}]`, error, additionalData);
};

const trackEvent = (eventName, data = {}) => {
  console.log(`[EVENT:${eventName}]`, data);
};

const ChatScreen = ({ selectedUser, isDarkMode, connectionStatus, onReconnect }) => {
  const { user, token } = useAuth();
  const { socket, sendMessage, joinConversation, leaveConversation, typingUsers, setTyping, onlineUsers } = useSocket();
  
  // State management
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImageSelection, setShowImageSelection] = useState(false);

  // Voice recording states
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingWaveform, setRecordingWaveform] = useState([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [audioPermission, setAudioPermission] = useState(null);

  // Audio playback states
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);

  // Refs
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const initializationRef = useRef(false);
  const textInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const waveformIntervalRef = useRef(null);
  const recordingAnimation = useRef(new Animated.Value(0)).current;

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

  // Request audio permissions
  useEffect(() => {
    const requestAudioPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Audio Recording Permission',
              message: 'This app needs access to your microphone to send voice messages.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          setAudioPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } else {
          const { status } = await Audio.requestPermissionsAsync();
          setAudioPermission(status === 'granted');
        }
      } catch (err) {
        console.error('Error requesting audio permission:', err);
        setAudioPermission(false);
      }
    };

    requestAudioPermission();
  }, []);

  // Keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates.height;
        setKeyboardHeight(keyboardHeight);
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Voice recording functions
  const startRecording = async () => {
    try {
      if (audioPermission === false) {
        Alert.alert('Permission Required', 'Please grant microphone permission to record voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingWaveform([]);
      setShowVoiceRecorder(true);

      // Start recording animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Update recording duration
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Simulate waveform
      waveformIntervalRef.current = setInterval(() => {
        setRecordingWaveform(prev => {
          const newWave = Math.random() * 40 + 10;
          return [...prev.slice(-20), newWave];
        });
      }, 100);

      trackEvent('VOICE_RECORDING_START');
    } catch (error) {
      trackError('VOICE_RECORDING_START_ERROR', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      // Stop intervals
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current);
      }

      // Stop animation
      recordingAnimation.stopAnimation();

      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecording(null);
      setIsRecording(false);
      setShowVoiceRecorder(false);

      // If recording is too short, discard it
      if (recordingDuration < 1) {
        Alert.alert('Too Short', 'Recording must be at least 1 second long.');
        return;
      }

      // Upload the recording
      await uploadAudioFile(uri, recordingDuration);

      trackEvent('VOICE_RECORDING_STOP', { duration: recordingDuration });
    } catch (error) {
      trackError('VOICE_RECORDING_STOP_ERROR', error);
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current);
      }

      recordingAnimation.stopAnimation();

      if (recording) {
        await recording.stopAndUnloadAsync();
      }

      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);
      setRecordingWaveform([]);
      setShowVoiceRecorder(false);

      trackEvent('VOICE_RECORDING_CANCEL');
    } catch (error) {
      trackError('VOICE_RECORDING_CANCEL_ERROR', error);
    }
  };

  const uploadAudioFile = async (uri, duration) => {
    try {
      trackEvent('AUDIO_UPLOAD_START', { duration });
      
      const fileName = `voice_message_${Date.now()}.m4a`;
      
      // Create form data
      const formData = new FormData();
      
      // Append audio file with correct MIME type for iOS recordings
      formData.append('file', {
        uri: uri,
        type: 'audio/m4a',
        name: fileName,
      });

      // Append required fields
      formData.append('conversationId', conversationId);
      formData.append('senderId', user._id);
      formData.append('duration', duration.toString());

      console.log('📤 Uploading audio file:', {
        fileName,
        duration,
        conversationId,
        uri: uri.substring(0, 50) + '...'
      });

      // Upload to your existing endpoint
      const response = await axios.post(`${API_BASE_URL}/api/messages/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      if (response.data?.success) {
        const serverMessage = response.data.message;
        trackEvent('AUDIO_UPLOAD_SUCCESS', { 
          messageId: serverMessage._id,
          duration 
        });
        
        console.log('✅ Audio upload successful:', serverMessage._id);
        
        // Add the message to local state immediately
        setMessages(prev => {
          const messageExists = prev.some(m => m._id === serverMessage._id);
          if (messageExists) return prev;
          
          const newMessages = [...prev, serverMessage];
          return newMessages;
        });
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
      } else {
        throw new Error('Upload failed - no success in response');
      }
      
    } catch (error) {
      console.error('❌ Audio upload error:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        duration,
        conversationId 
      });
      
      trackError('AUDIO_UPLOAD_ERROR', error, { 
        duration,
        conversationId 
      });
      
      Alert.alert(
        'Upload Failed', 
        `Failed to upload voice message: ${error.response?.data?.message || error.message}`
      );
    }
  };

  // Audio playback functions
  const playAudio = async (audioUrl, messageId) => {
    try {
      // Stop currently playing audio
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);
      setCurrentPlayingId(messageId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setCurrentPlayingId(null);
        }
      });

      trackEvent('AUDIO_PLAYBACK_START', { messageId });
    } catch (error) {
      trackError('AUDIO_PLAYBACK_ERROR', error, { messageId });
      Alert.alert('Playback Error', 'Could not play the audio message.');
    }
  };

  const stopAudio = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setCurrentPlayingId(null);
      }
    } catch (error) {
      trackError('AUDIO_STOP_ERROR', error);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current);
      }
    };
  }, [sound]);

  // Get or create conversation
  const getOrCreateConversation = async () => {
    try {
      trackEvent('CONVERSATION_FETCH_START', { participantId: selectedUser._id });
      
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
          trackEvent('CONVERSATION_FOUND', { conversationId: existingConversation._id });
          return existingConversation;
        }
      }

      // Create new conversation
      trackEvent('CONVERSATION_CREATE_START');
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
        trackEvent('CONVERSATION_CREATED', { conversationId: createResponse.data.conversation._id });
        return createResponse.data.conversation;
      }

      throw new Error('Failed to create conversation - no success response');
    } catch (error) {
      trackError('CONVERSATION_ERROR', error, { 
        participantId: selectedUser._id,
        userId: user._id 
      });
      setError('Failed to start conversation');
      return null;
    }
  };

  // Fetch messages
  const fetchMessages = async (convId) => {
    if (!convId) {
      trackError('FETCH_MESSAGES_NO_CONVERSATION', new Error('No conversation ID'));
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      trackEvent('MESSAGES_FETCH_START', { conversationId: convId });
      
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
        const messages = response.data.messages || [];
        trackEvent('MESSAGES_FETCH_SUCCESS', { 
          conversationId: convId, 
          messageCount: messages.length 
        });
        return messages;
      }
      throw new Error('Invalid response format from messages API');
    } catch (error) {
      trackError('MESSAGES_FETCH_ERROR', error, { 
        conversationId: convId,
        endpoint: `${API_BASE_URL}/api/conversations/${convId}/messages`
      });
      setError('Failed to load messages');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Initialize chat
  const initializeChat = useCallback(async () => {
    if (initializationRef.current) return;
    
    try {
      initializationRef.current = true;
      setLoading(true);
      trackEvent('CHAT_INIT_START');
      
      const conversationData = await getOrCreateConversation();
      if (!conversationData) {
        throw new Error('Could not create or find conversation');
      }
      
      setConversation(conversationData);
      setConversationId(conversationData._id);
      
      const messagesData = await fetchMessages(conversationData._id);
      setMessages(messagesData);
      
      trackEvent('CHAT_INIT_SUCCESS', { 
        conversationId: conversationData._id,
        messageCount: messagesData.length 
      });
      
    } catch (error) {
      trackError('CHAT_INIT_ERROR', error);
      setError(error.message);
    } finally {
      setLoading(false);
      initializationRef.current = false;
    }
  }, [selectedUser, user?._id, token]);

  // Socket event handlers
  useEffect(() => {
    if (socket && conversationId) {
      trackEvent('SOCKET_JOIN_CONVERSATION', { conversationId });
      joinConversation(conversationId);

      const handleMessage = (msg) => {
        if (msg.conversationId === conversationId) {
          trackEvent('SOCKET_MESSAGE_RECEIVED', { 
            messageId: msg._id, 
            type: msg.type 
          });
          
          // Update messages state immediately when receiving via socket
          setMessages(prev => {
            const messageExists = prev.some(m => m._id === msg._id);
            if (messageExists) return prev;
            
            const newMessages = [...prev, msg];
            return newMessages;
          });
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      };

      const handleTyping = (data) => {
        trackEvent('SOCKET_TYPING_UPDATE', data);
      };

      const handleError = (error) => {
        trackError('SOCKET_ERROR', error, { conversationId });
      };

      socket.on('message', handleMessage);
      socket.on('typing', handleTyping);
      socket.on('error', handleError);

      return () => {
        trackEvent('SOCKET_LEAVE_CONVERSATION', { conversationId });
        leaveConversation(conversationId);
        socket.off('message', handleMessage);
        socket.off('typing', handleTyping);
        socket.off('error', handleError);
      };
    }
  }, [socket, conversationId]);

  // File upload function
  const uploadFile = async (uri, type, fileName, isMultiple = false) => {
    let uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      trackEvent('FILE_UPLOAD_START', { type, fileName, isMultiple });
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

      // Create form data
      const formData = new FormData();
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      // Append file
      formData.append('file', {
        uri: uri,
        type: getMimeType(type, fileName),
        name: fileName,
      });

      // Append required fields
      formData.append('conversationId', conversationId);
      formData.append('senderId', user._id);

      // Use your existing upload endpoint
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
        trackEvent('FILE_UPLOAD_SUCCESS', { 
          type, 
          fileName, 
          messageId: serverMessage._id,
          isMultiple 
        });
        
        // Add the message to local state immediately
        setMessages(prev => {
          const messageExists = prev.some(m => m._id === serverMessage._id);
          if (messageExists) return prev;
          
          const newMessages = [...prev, serverMessage];
          return newMessages;
        });
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
      } else {
        throw new Error('Upload failed - no success in response');
      }
      
    } catch (error) {
      trackError('FILE_UPLOAD_ERROR', error, { 
        type, 
        fileName,
        endpoint: `${API_BASE_URL}/api/messages/upload`,
        conversationId 
      });
      
      Alert.alert('Upload Failed', 'Failed to upload file. Please try again.');
    } finally {
      // Clean up progress indicator
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
  const uploadMultipleImages = async (images) => {
    trackEvent('MULTIPLE_IMAGES_UPLOAD_START', { count: images.length });
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      await uploadFile(image.uri, 'image', image.fileName || `image_${Date.now()}_${i}.jpg`, true);
    }
    
    // Clear selected images after upload
    setSelectedImages([]);
    setShowImageSelection(false);
    trackEvent('MULTIPLE_IMAGES_UPLOAD_COMPLETE', { count: images.length });
  };

  const getMimeType = (type, fileName) => {
    if (type === 'image') {
      if (fileName?.endsWith('.png')) return 'image/png';
      if (fileName?.endsWith('.gif')) return 'image/gif';
      if (fileName?.endsWith('.webp')) return 'image/webp';
      return 'image/jpeg';
    }
    return 'image/jpeg';
  };

  // Send text message via socket
  const sendMessageViaSocketOrAPI = async (messageData) => {
    const tempId = `local-${Date.now()}`;
    
    try {
      trackEvent('MESSAGE_SEND_START', { 
        type: messageData.type, 
        contentLength: messageData.content?.length 
      });

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

      // For text messages, use socket only
      if (connectionStatus === 'connected') {
        await sendMessage(messageData);
        
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempId ? { ...msg, status: 'sent' } : msg
          )
        );
        trackEvent('MESSAGE_SEND_SOCKET_SUCCESS', { messageId: tempId });
      } else {
        // When socket is disconnected, show error for text messages
        throw new Error('No connection - cannot send message');
      }
      
    } catch (error) {
      trackError('MESSAGE_SEND_ERROR', error, { messageData });
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
      Alert.alert('Error', 'Failed to send message. Please check your connection and try again.');
    }
  };

  // Image Picker
  const pickImages = async () => {
    try {
      trackEvent('IMAGE_PICKER_OPEN');
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 10,
      });

      trackEvent('IMAGE_PICKER_RESULT', { 
        canceled: result.canceled, 
        assetsCount: result.assets?.length 
      });

      if (!result.canceled && result.assets?.length > 0) {
        setShowAttachmentMenu(false);
        
        // Show image selection preview
        setSelectedImages(result.assets);
        setShowImageSelection(true);
      }
    } catch (error) {
      trackError('IMAGE_PICKER_ERROR', error);
      Alert.alert('Error', 'Failed to pick images: ' + error.message);
    }
  };

  // Handle file viewing
  const handleFileOpen = async (fileUrl, fileName, type, itemId) => {
    try {
      trackEvent('FILE_OPEN', { type, fileName, itemId });
      
      if (type === 'image') {
        // Show image in full screen preview
        setImagePreview(fileUrl);
      }
    } catch (error) {
      trackError('FILE_OPEN_ERROR', error, { type, fileName, itemId });
      Alert.alert('Error', 'Could not open file');
    }
  };

  // Remove selected image
  const removeSelectedImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Typing handler with debounce
  const handleInputChange = (text) => {
    setInput(text);
    
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

  // Focus handler to ensure input is visible
  const handleInputFocus = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 300);
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
    
    // Dismiss keyboard after sending
    Keyboard.dismiss();
  };

  const handleRetry = () => {
    trackEvent('CHAT_RETRY');
    setError(null);
    initializationRef.current = false;
    initializeChat();
  };

  // Utility functions
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render message content
  const renderMessageContent = (item) => {
    const isMyMessage = item.senderId?._id === user._id || item.senderId === user._id;

    switch (item.type) {
      case 'image':
        return (
          <TouchableOpacity 
            style={styles.fileMessageContainer}
            onPress={() => handleFileOpen(item.fileUrl, item.fileName, 'image', item._id)}
          >
            <Image 
              source={{ uri: item.fileUrl }} 
              style={styles.imageMessage}
              resizeMode="cover"
              onError={() => {
                trackError('IMAGE_LOAD_ERROR', new Error('Failed to load image'), { messageId: item._id });
              }}
            />
            <View style={styles.fileInfo}>
              <Ionicons name="image" size={12} color={isMyMessage ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.fileName,
                isMyMessage ? styles.myFileText : styles.theirFileText
              ]}>
                Image
              </Text>
            </View>
          </TouchableOpacity>
        );

      case 'audio':
        const isPlayingThis = currentPlayingId === item._id && isPlaying;
        return (
          <TouchableOpacity 
            style={[
              styles.audioMessageContainer,
              isMyMessage ? styles.myAudioContainer : styles.theirAudioContainer
            ]}
            onPress={() => {
              if (isPlayingThis) {
                stopAudio();
              } else {
                playAudio(item.fileUrl, item._id);
              }
            }}
          >
            <View style={styles.audioPlayer}>
              <Ionicons 
                name={isPlayingThis ? "pause-circle" : "play-circle"} 
                size={24} 
                color={isMyMessage ? '#FFFFFF' : '#3B82F6'} 
              />
              <View style={styles.audioWaveform}>
                <View style={[
                  styles.audioProgress,
                  { 
                    width: isPlayingThis ? '50%' : '0%',
                    backgroundColor: isMyMessage ? '#FFFFFF' : '#3B82F6'
                  }
                ]} />
              </View>
              <Text style={[
                styles.audioDuration,
                isMyMessage ? styles.myAudioText : styles.theirAudioText
              ]}>
                {formatDuration(item.duration || 0)}
              </Text>
            </View>
            <View style={styles.fileInfo}>
              <Ionicons name="mic" size={12} color={isMyMessage ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.fileName,
                isMyMessage ? styles.myFileText : styles.theirFileText
              ]}>
                Voice message
              </Text>
            </View>
          </TouchableOpacity>
        );

      default:
        return (
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText,
          ]}>
            {item.content}
          </Text>
        );
    }
  };

  // Render message item
  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId?._id === user._id || item.senderId === user._id;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessage : styles.theirMessage,
          item.type !== 'text' && styles.fileMessageBubble
        ]}>
          {renderMessageContent(item)}
          
          <View style={styles.timestampContainer}>
            <Text style={[
              styles.timestamp,
              isMyMessage ? styles.myTimestamp : styles.theirTimestamp
            ]}>
              {formatTime(item.createdAt)}
            </Text>
            {isMyMessage && (
              <>
                {item.status === 'pending' && (
                  <Ionicons name="time-outline" size={8} color="#6B7280" />
                )}
                {item.status === 'sent' && (
                  <Ionicons name="checkmark" size={8} color="#6B7280" />
                )}
                {item.status === 'failed' && (
                  <TouchableOpacity onPress={() => handleRetry()}>
                    <Ionicons name="warning" size={8} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Attachment Menu - Compact design with microphone separate
  const renderAttachmentMenu = () => (
    <Modal
      visible={showAttachmentMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAttachmentMenu(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowAttachmentMenu(false)}
      >
        <View style={[
          styles.attachmentMenu,
          isDarkMode && styles.darkAttachmentMenu,
        ]}>
          <View style={styles.attachmentOptions}>
            <TouchableOpacity 
              style={styles.attachmentOption}
              onPress={pickImages}
            >
              <View style={[styles.attachmentIcon, { backgroundColor: '#3B82F6' }]}>
                <Ionicons name="images" size={20} color="#FFFFFF" />
              </View>
              <Text style={[
                styles.attachmentOptionText,
                isDarkMode && styles.darkText
              ]}>
                Images
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Voice Recorder Modal
  const renderVoiceRecorder = () => (
    <Modal
      visible={showVoiceRecorder}
      transparent
      animationType="slide"
      onRequestClose={cancelRecording}
    >
      <View style={[
        styles.voiceRecorderContainer,
        isDarkMode && styles.darkVoiceRecorderContainer
      ]}>
        <View style={styles.voiceRecorderHeader}>
          <Text style={[
            styles.voiceRecorderTitle,
            isDarkMode && styles.darkText
          ]}>
            Recording...
          </Text>
          <Text style={[
            styles.recordingDuration,
            isDarkMode && styles.darkText
          ]}>
            {formatDuration(recordingDuration)}
          </Text>
        </View>

        <View style={styles.waveformContainer}>
          {recordingWaveform.map((height, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: height,
                  backgroundColor: isDarkMode ? '#3B82F6' : '#2563EB',
                }
              ]}
            />
          ))}
        </View>

        <View style={styles.recordingIndicator}>
          <Animated.View
            style={[
              styles.recordingDot,
              {
                backgroundColor: '#EF4444',
                opacity: recordingAnimation,
              }
            ]}
          />
          <Text style={[
            styles.recordingText,
            isDarkMode && styles.darkText
          ]}>
            Recording in progress
          </Text>
        </View>

        <View style={styles.voiceRecorderActions}>
          <TouchableOpacity 
            style={[
              styles.cancelRecordingButton,
              isDarkMode && styles.darkCancelButton
            ]}
            onPress={cancelRecording}
          >
            <Text style={[
              styles.cancelRecordingText,
              isDarkMode && styles.darkText
            ]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.stopRecordingButton}
            onPress={stopRecording}
          >
            <Ionicons name="stop" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Image Selection Preview Modal
  const renderImageSelection = () => (
    <Modal
      visible={showImageSelection}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setShowImageSelection(false);
        setSelectedImages([]);
      }}
    >
      <View style={[
        styles.imageSelectionContainer,
        isDarkMode && styles.darkImageSelectionContainer
      ]}>
        <View style={styles.imageSelectionHeader}>
          <Text style={[
            styles.imageSelectionTitle,
            isDarkMode && styles.darkText
          ]}>
            Selected Images ({selectedImages.length})
          </Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              setShowImageSelection(false);
              setSelectedImages([]);
            }}
          >
            <Ionicons name="close" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={selectedImages}
          keyExtractor={(item, index) => `selected-image-${index}`}
          numColumns={3}
          contentContainerStyle={styles.imageSelectionGrid}
          renderItem={({ item, index }) => (
            <View style={styles.imageSelectionItem}>
              <Image 
                source={{ uri: item.uri }} 
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => removeSelectedImage(index)}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />

        <View style={styles.imageSelectionActions}>
          <TouchableOpacity 
            style={[
              styles.cancelButton,
              isDarkMode && styles.darkCancelButton
            ]}
            onPress={() => {
              setShowImageSelection(false);
              setSelectedImages([]);
            }}
          >
            <Text style={[
              styles.cancelButtonText,
              isDarkMode && styles.darkText
            ]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sendImagesButton}
            onPress={() => uploadMultipleImages(selectedImages)}
            disabled={selectedImages.length === 0}
          >
            <Text style={styles.sendImagesButtonText}>
              Send {selectedImages.length} Image{selectedImages.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Image Preview Modal
  const renderImagePreview = () => (
    <Modal
      visible={!!imagePreview}
      transparent
      animationType="fade"
      onRequestClose={() => setImagePreview(null)}
    >
      <View style={styles.imagePreviewOverlay}>
        <TouchableOpacity 
          style={styles.imagePreviewClose}
          onPress={() => setImagePreview(null)}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Image 
          source={{ uri: imagePreview }} 
          style={styles.imagePreview}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );

  // Cleanup effects
  useEffect(() => {
    return () => {
      // Cleanup timers
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      trackEvent('CHAT_SCREEN_UNMOUNT');
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

  // Loading state
  if (loading) {
    return (
      <View style={[
        styles.container,
        isDarkMode && styles.darkContainer,
        styles.centered
      ]}>
        <ActivityIndicator size="small" color={isDarkMode ? '#60A5FA' : '#3B82F6'} />
        <Text style={[
          styles.loadingText,
          isDarkMode && styles.darkText
        ]}>
          Loading...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[
        styles.container,
        isDarkMode && styles.darkContainer,
        styles.centered
      ]}>
        <Ionicons name="warning-outline" size={32} color="#EF4444" />
        <Text style={[
          styles.errorText,
          isDarkMode && styles.darkText
        ]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={[
            styles.retryButton, 
            isDarkMode && styles.darkRetryButton
          ]}
          onPress={handleRetry}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      isDarkMode && styles.darkContainer
    ]}>
      {/* Header - Compact design */}
      <View style={[
        styles.header,
        isDarkMode && styles.darkHeader
      ]}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <Text style={[
              styles.participantName,
              isDarkMode && styles.darkText
            ]} numberOfLines={1}>
              {participant?.businessName || `${participant?.firstName} ${participant?.lastName}` || 'User'}
            </Text>
            <Text style={[
              styles.participantRole,
              isDarkMode && styles.darkSubtext
            ]} numberOfLines={1}>
              {participant?.role || 'User'} • 
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusIndicator,
                  onlineUsers.includes(participant?._id) ? styles.onlineStatus : styles.offlineStatus
                ]} />
                <Text style={[
                  styles.statusText,
                  isDarkMode && styles.darkSubtext
                ]}>
                  {onlineUsers.includes(participant?._id) ? 'Online' : 'Offline'}
                </Text>
              </View>
            </Text>
          </View>
        </View>
      </View>

      {connectionStatus !== 'connected' && (
        <View style={[
          styles.connectionBar,
          isDarkMode && styles.darkConnectionBar
        ]}>
          <Ionicons 
            name="cloud-offline" 
            size={12} 
            color="#6B7280" 
          />
          <Text style={[
            styles.connectionText,
            isDarkMode && styles.darkConnectionText
          ]}>
            Connecting...
          </Text>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id || item.localId}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={[
          styles.messagesContainer,
          { paddingBottom: keyboardHeight > 0 ? 80 : 20 }
        ]}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="chatbubble-outline" 
              size={40} 
              color={isDarkMode ? '#4B5563' : '#9CA3AF'} 
            />
            <Text style={[
              styles.emptyText,
              isDarkMode && styles.darkText
            ]}>
              No messages yet
            </Text>
          </View>
        }
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      {isUserTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={isDarkMode ? '#60A5FA' : '#3B82F6'} />
            <Text style={[
              styles.typingText,
              isDarkMode && styles.darkTypingText
            ]}>
              typing...
            </Text>
          </View>
        </View>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).map(uploadId => (
        <View key={uploadId} style={styles.uploadProgressContainer}>
          <View style={styles.uploadProgressBar}>
            <View 
              style={[
                styles.uploadProgressFill,
                { width: `${uploadProgress[uploadId]}%` }
              ]} 
            />
          </View>
          <Text style={styles.uploadProgressText}>
            Uploading {Math.round(uploadProgress[uploadId])}%
          </Text>
        </View>
      ))}

      {/* Input Container - Fixed positioning */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={[
          styles.inputContainer,
          isDarkMode && styles.darkInputContainer,
        ]}
      >
        <TouchableOpacity 
          style={[
            styles.attachmentButton,
            isDarkMode && styles.darkAttachmentButton
          ]}
          onPress={() => setShowAttachmentMenu(true)}
        >
          <Ionicons 
            name="images" 
            size={20} 
            color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.micButton,
            isDarkMode && styles.darkMicButton
          ]}
          onPress={startRecording}
        >
          <Ionicons 
            name="mic" 
            size={20} 
            color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
          />
        </TouchableOpacity>
        
        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            isDarkMode && styles.darkTextInput
          ]}
          placeholder="Type a message..."
          placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
          value={input}
          onChangeText={handleInputChange}
          onFocus={handleInputFocus}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        
        <TouchableOpacity 
          style={[
            styles.sendButton,
            isDarkMode && styles.darkSendButton,
            !input.trim() && styles.sendButtonDisabled
          ]} 
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Ionicons 
            name="send" 
            size={18} 
            color={!input.trim() ? (isDarkMode ? '#6B7280' : '#9CA3AF') : '#FFFFFF'} 
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {renderAttachmentMenu()}
      {renderVoiceRecorder()}
      {renderImageSelection()}
      {renderImagePreview()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Compact Header Styles
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 50,
  },
  darkHeader: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  participantRole: {
    fontSize: 12,
    color: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  onlineStatus: {
    backgroundColor: '#10B981',
  },
  offlineStatus: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
  },
  darkConnectionBar: {
    backgroundColor: '#1F2937',
  },
  connectionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  darkConnectionText: {
    color: '#D1D5DB',
  },
  // Messages List
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  darkRetryButton: {
    backgroundColor: '#2563EB',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  messageContainer: {
    marginVertical: 2,
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 2,
  },
  fileMessageBubble: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  myMessage: {
    backgroundColor: '#3B82F6',
  },
  theirMessage: {
    backgroundColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#374151',
  },
  fileMessageContainer: {
    alignItems: 'center',
  },
  imageMessage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  // Audio Message Styles
  audioMessageContainer: {
    alignItems: 'center',
    minWidth: 200,
  },
  myAudioContainer: {
    backgroundColor: 'transparent',
  },
  theirAudioContainer: {
    backgroundColor: 'transparent',
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 4,
  },
  audioWaveform: {
    flex: 1,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  audioProgress: {
    height: '100%',
    borderRadius: 10,
  },
  audioDuration: {
    fontSize: 12,
    fontWeight: '500',
  },
  myAudioText: {
    color: '#FFFFFF',
  },
  theirAudioText: {
    color: '#374151',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileName: {
    fontSize: 11,
    fontWeight: '500',
  },
  myFileText: {
    color: '#FFFFFF',
  },
  theirFileText: {
    color: '#374151',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.7,
  },
  myTimestamp: {
    color: '#E5E7EB',
  },
  theirTimestamp: {
    color: '#6B7280',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  darkTypingText: {
    color: '#9CA3AF',
  },
  // Input Container - Fixed at bottom
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  darkInputContainer: {
    backgroundColor: '#1F2937',
    borderTopColor: '#374151',
  },
  attachmentButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  darkAttachmentButton: {
    backgroundColor: '#374151',
  },
  micButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  darkMicButton: {
    backgroundColor: '#374151',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxHeight: 90,
    fontSize: 14,
    lineHeight: 18,
  },
  darkTextInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#FFFFFF',
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkSendButton: {
    backgroundColor: '#2563EB',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  // Attachment Menu - Compact design
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-end',
  },
  attachmentMenu: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    paddingBottom: 20,
  },
  darkAttachmentMenu: {
    backgroundColor: '#1F2937',
  },
  attachmentOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  attachmentOption: {
    alignItems: 'center',
    padding: 12,
  },
  attachmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  attachmentOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  // Voice Recorder Styles
  voiceRecorderContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkVoiceRecorderContainer: {
    backgroundColor: '#111827',
  },
  voiceRecorderHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  voiceRecorderTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  recordingDuration: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  waveformBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 1.5,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    color: '#374151',
  },
  voiceRecorderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  cancelRecordingButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelRecordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  stopRecordingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Image Selection Styles
  imageSelectionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkImageSelectionContainer: {
    backgroundColor: '#111827',
  },
  imageSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  imageSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  imageSelectionGrid: {
    padding: 8,
  },
  imageSelectionItem: {
    width: (width - 32) / 3,
    height: (width - 32) / 3,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
  },
  imageSelectionActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sendImagesButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  sendImagesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Image Preview Styles
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imagePreview: {
    width: '100%',
    height: '80%',
  },
  // Upload Progress Styles
  uploadProgressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
  },
  uploadProgressBar: {
    height: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  uploadProgressText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
});

export default ChatScreen;