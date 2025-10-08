import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaPlay, FaPause, FaTrash, FaPaperPlane } from 'react-icons/fa';

const VoiceRecorder = ({ onRecordingComplete, onCancel, onRecordingStateChange, isMobile = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange(isRecording);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, onRecordingStateChange]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio({ blob: audioBlob, url: audioUrl });
        clearInterval(recordingTimerRef.current);
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      visualizeAudio();

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied. Please allow microphone permissions to record voice messages.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
    };

    draw();
  };

  const playRecording = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setRecordedAudio(null);
    setIsPlaying(false);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  };

  const sendRecording = () => {
    if (recordedAudio) {
      onRecordingComplete(recordedAudio.blob);
      setRecordedAudio(null);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const buttonSize = isMobile ? 'p-2' : 'p-3';
  const iconSize = isMobile ? 'text-xs' : 'text-sm';

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
      <audio ref={audioRef} src={recordedAudio?.url} onEnded={() => setIsPlaying(false)} />
      
      {!recordedAudio ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`${buttonSize} rounded-full transition-all duration-200 ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRecording ? <FaStop /> : <FaMicrophone />}
            </button>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                {isRecording && (
                  <div className="flex space-x-1">
                    <div className="w-2 h-4 bg-red-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-6 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-4 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {isRecording ? 'Recording...' : 'Click to record'}
                </span>
              </div>
              
              {isRecording && (
                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                  {formatTime(recordingTime)}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isRecording}
          >
            <FaTrash />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={isPlaying ? pauseRecording : playRecording}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            
            <div className="flex-1">
              <div className="bg-gray-200 dark:bg-gray-600 h-2 rounded-full">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: isPlaying ? '50%' : '0%' }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                {formatTime(recordingTime)}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={deleteRecording}
              className="p-2 text-red-500 hover:text-red-700"
            >
              <FaTrash />
            </button>
            <button
              onClick={sendRecording}
              className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;