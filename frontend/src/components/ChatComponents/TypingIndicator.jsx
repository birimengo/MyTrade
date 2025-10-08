import React from 'react';

const TypingIndicator = ({ 
  typingUsers = [], 
  recordingUsers = [],
  participants = [], 
  currentUserId,
  isMobile = false
}) => {
  const filteredTypingUsers = typingUsers.filter(userId => userId !== currentUserId);
  const filteredRecordingUsers = recordingUsers.filter(userId => userId !== currentUserId);

  if (filteredTypingUsers.length === 0 && filteredRecordingUsers.length === 0) return null;

  const getParticipantNames = (userIds) => {
    return userIds.map(userId => {
      const participant = participants.find(p => p._id === userId);
      return participant ? participant.firstName : 'Someone';
    });
  };

  const typingNames = getParticipantNames(filteredTypingUsers);
  const recordingNames = getParticipantNames(filteredRecordingUsers);

  const textSize = isMobile ? 'text-xs' : 'text-xs';

  return (
    <div className="space-y-1 px-3 py-1">
      {typingNames.length > 0 && (
        <div className={`flex items-center space-x-2 ${textSize} text-gray-500 dark:text-gray-400`}>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <span>
            {typingNames.length === 1 
              ? `${typingNames[0]} is typing...`
              : `${typingNames.join(', ')} are typing...`
            }
          </span>
        </div>
      )}

      {recordingNames.length > 0 && (
        <div className={`flex items-center space-x-2 ${textSize} text-red-500 dark:text-red-400`}>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </div>
          <span>
            {recordingNames.length === 1 
              ? `${recordingNames[0]} is recording...`
              : `${recordingNames.join(', ')} are recording...`
            }
          </span>
        </div>
      )}
    </div>
  );
};

export default TypingIndicator;