import React from 'react';
import Message from './Message';

const MessageList = ({ messages, currentUserId, socket, conversationId, isMobile = false }) => {
  const handleAudioPlayback = (isPlaying, messageId) => {
    if (socket && conversationId) {
      socket.emit('audioPlayback', {
        conversationId,
        messageId,
        isPlaying
      });
    }
  };

  const containerPadding = isMobile ? 'px-1 py-2' : 'px-3 py-4';

  return (
    <div className={`space-y-2 ${containerPadding}`}>
      {messages.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No messages yet. Start a conversation!
        </div>
      ) : (
        messages.map((message) => (
          <Message
            key={message._id}
            message={message}
            isOwn={message.senderId._id === currentUserId}
            socket={socket}
            conversationId={conversationId}
            onAudioPlayback={(isPlaying) => handleAudioPlayback(isPlaying, message._id)}
            isMobile={isMobile}
          />
        ))
      )}
    </div>
  );
};

export default MessageList;