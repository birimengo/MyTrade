import React, { useState, useRef, useEffect } from 'react';
import { 
  FaPlay, 
  FaPause, 
  FaDownload, 
  FaFile, 
  FaImage, 
  FaFilePdf, 
  FaFileWord, 
  FaFileExcel, 
  FaMusic, 
  FaTimes,
  FaVolumeUp,
  FaVolumeMute,
  FaVolumeDown,
  FaVolumeOff
} from 'react-icons/fa';

const Message = ({ message, isOwn, socket, conversationId, onAudioPlayback, isMobile = false }) => {
  const [imageError, setImageError] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const audioRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const volumeControlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (volumeControlRef.current && !volumeControlRef.current.contains(event.target)) {
        setShowVolumeControl(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (type, fileName) => {
    if (!fileName) return <FaFile className="text-gray-500" />;
    
    const extension = fileName?.split('.').pop().toLowerCase();
    
    if (type === 'image') return <FaImage className="text-blue-500" />;
    if (extension === 'pdf') return <FaFilePdf className="text-red-500" />;
    if (['doc', 'docx'].includes(extension)) return <FaFileWord className="text-blue-600" />;
    if (['xls', 'xlsx'].includes(extension)) return <FaFileExcel className="text-green-600" />;
    if (['txt', 'text'].includes(extension)) return <FaFile className="text-gray-500" />;
    if (['zip', 'rar', '7z'].includes(extension)) return <FaFile className="text-amber-500" />;
    if (['webm', 'mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return <FaMusic className="text-purple-500" />;
    return <FaFile className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'file';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const openImageModal = () => {
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  const toggleAudioPlayback = async () => {
    if (!audioRef.current) return;

    try {
      if (audioPlaying) {
        audioRef.current.pause();
        setAudioPlaying(false);
        if (onAudioPlayback) onAudioPlayback(false);
      } else {
        if (audioRef.current.readyState === 0) {
          await audioRef.current.load();
        }
        audioRef.current.volume = isMuted ? 0 : audioVolume;
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setAudioPlaying(true);
              if (onAudioPlayback) onAudioPlayback(true);
            })
            .catch(error => {
              console.error('Error playing audio:', error);
            });
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleAudioPlay = () => {
    setAudioPlaying(true);
    startProgressTracking();
  };

  const handleAudioPause = () => {
    setAudioPlaying(false);
    stopProgressTracking();
  };

  const handleAudioEnded = () => {
    setAudioPlaying(false);
    setAudioProgress(0);
    stopProgressTracking();
    if (onAudioPlayback) onAudioPlayback(false);
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress || 0);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setAudioVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = audioVolume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || audioVolume === 0) return <FaVolumeMute className="text-xs" />;
    if (audioVolume <= 0.3) return <FaVolumeOff className="text-xs" />;
    if (audioVolume <= 0.6) return <FaVolumeDown className="text-xs" />;
    return <FaVolumeUp className="text-xs" />;
  };

  const startProgressTracking = () => {
    stopProgressTracking();
    progressIntervalRef.current = setInterval(() => {
      if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setAudioProgress(progress);
      }
    }, 100);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !audioDuration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekTime = (clickX / width) * audioDuration;
    
    audioRef.current.currentTime = seekTime;
    setAudioProgress((seekTime / audioDuration) * 100);
  };

  const toggleVolumeControl = () => {
    setShowVolumeControl(!showVolumeControl);
  };

  const hasFile = message.type !== 'text' && message.fileUrl;

  const messageMaxWidth = isMobile ? 'max-w-[85%]' : 'max-w-xs';
  const textSize = isMobile ? 'text-xs' : 'text-sm';
  const timestampSize = isMobile ? 'text-[10px]' : 'text-xs';
  const audioButtonSize = isMobile ? 'p-1.5' : 'p-2';
  const audioIconSize = isMobile ? 'text-[10px]' : 'text-xs';
  const imageMaxHeight = isMobile ? 'max-h-32' : 'max-h-48';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`${messageMaxWidth} px-3 py-1.5 rounded-lg ${
          isOwn
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
        }`}
      >
        {message.type === 'text' && (
          <>
            <p className={textSize}>{message.content}</p>
            <p className={`${timestampSize} mt-0.5 ${isOwn ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
              {formatTime(message.createdAt)}
            </p>
          </>
        )}

        {hasFile && (
          <div className="space-y-1">
            {message.type === 'image' && !imageError && (
              <>
                <div 
                  className="cursor-pointer"
                  onClick={openImageModal}
                >
                  <img
                    src={message.fileUrl}
                    alt={message.fileName || 'Shared image'}
                    className={`rounded-lg max-w-full h-auto ${imageMaxHeight} object-cover`}
                    onError={handleImageError}
                    loading="lazy"
                  />
                </div>
                {message.fileName && (
                  <div className="flex items-center justify-between">
                    <span className={`${timestampSize} text-gray-500 dark:text-gray-400 truncate`}>
                      {message.fileName}
                    </span>
                    <button
                      onClick={() => handleDownload(message.fileUrl, message.fileName)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Download"
                    >
                      <FaDownload className={audioIconSize} />
                    </button>
                  </div>
                )}
              </>
            )}

            {message.type === 'document' && (
              <div className="flex items-center space-x-2">
                <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gray-100 dark:bg-gray-600 rounded-lg`}>
                  {getFileIcon(message.fileType, message.fileName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`${textSize} font-medium truncate`}>{message.fileName || 'Document'}</p>
                  <p className={timestampSize}>
                    {formatFileSize(message.fileSize)}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(message.fileUrl, message.fileName)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Download"
                >
                  <FaDownload className={audioIconSize} />
                </button>
              </div>
            )}

            {message.type === 'audio' && (
              <div className="flex items-center space-x-2">
                <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gray-100 dark:bg-gray-600 rounded-lg`}>
                  <FaMusic className="text-purple-500" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`${textSize} font-medium truncate`}>Voice message</p>
                  
                  <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'} mt-1`}>
                    <button
                      onClick={toggleAudioPlayback}
                      className={`${audioButtonSize} rounded-full flex-shrink-0 ${
                        isOwn ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 dark:bg-gray-500 text-gray-700 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-400'
                      } transition-colors duration-200`}
                    >
                      {audioPlaying ? (
                        <FaPause className={audioIconSize} />
                      ) : (
                        <FaPlay className={audioIconSize} style={{ transform: 'translateX(1px)' }} />
                      )}
                    </button>
                    
                    <div className="flex-1 space-y-1 min-w-0">
                      <div 
                        className="w-full bg-gray-300 dark:bg-gray-500 h-2 rounded-full overflow-hidden cursor-pointer"
                        onClick={handleSeek}
                      >
                        <div 
                          className={`h-2 rounded-full transition-all duration-100 ${
                            isOwn ? 'bg-blue-200' : 'bg-blue-500'
                          }`}
                          style={{ width: `${audioProgress}%` }}
                        ></div>
                      </div>
                      
                      <div className={`flex justify-between items-center ${timestampSize} text-gray-500 dark:text-gray-400`}>
                        <span>{formatAudioTime(audioRef.current?.currentTime || 0)}</span>
                        <span>{formatAudioTime(audioDuration)}</span>
                      </div>
                    </div>

                    {!isMobile && (
                      <div className="relative" ref={volumeControlRef}>
                        <button
                          onClick={toggleVolumeControl}
                          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          title="Volume control"
                        >
                          {getVolumeIcon()}
                        </button>
                        
                        {showVolumeControl && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={isMuted ? 0 : audioVolume}
                              onChange={handleVolumeChange}
                              className="w-16 h-1 bg-gray-300 dark:bg-gray-500 rounded-lg appearance-none cursor-pointer"
                              orient="vertical"
                              style={{
                                writingMode: 'bt-lr',
                                WebkitAppearance: 'slider-vertical'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={toggleMute}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <FaVolumeMute className={audioIconSize} /> : <FaVolumeUp className={audioIconSize} />}
                    </button>

                    <button
                      onClick={() => handleDownload(message.fileUrl, message.fileName || 'voice-message.webm')}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
                      title="Download"
                    >
                      <FaDownload className={audioIconSize} />
                    </button>
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  src={message.fileUrl}
                  onPlay={handleAudioPlay}
                  onPause={handleAudioPause}
                  onEnded={handleAudioEnded}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={handleAudioLoadedMetadata}
                  preload="metadata"
                />
              </div>
            )}

            {message.type !== 'audio' && (
              <p className={`${timestampSize} ${isOwn ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {formatTime(message.createdAt)}
              </p>
            )}
          </div>
        )}

        {showImageModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={closeImageModal}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-4xl max-h-full mx-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-lg'}`}>
                  {message.fileName || 'Image'}
                </h3>
                <button
                  onClick={closeImageModal}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes className={isMobile ? "text-base" : "text-lg"} />
                </button>
              </div>
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Shared image'}
                className="max-w-full max-h-96 object-contain"
              />
              <div className="mt-4 flex justify-between items-center">
                <span className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {formatFileSize(message.fileSize)}
                </span>
                <button
                  onClick={() => handleDownload(message.fileUrl, message.fileName || 'image')}
                  className={`bg-blue-600 text-white rounded-md hover:bg-blue-700 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'}`}
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;