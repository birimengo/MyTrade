import React from 'react';
import Message from './Message';

const MessageList = ({ messages, currentUserId, socket, conversationId }) => {
  const handleAudioPlayback = (isPlaying, messageId) => {
    if (socket && conversationId) {
      socket.emit('audioPlayback', {
        conversationId,
        messageId,
        isPlaying
      });
    }
  };

  return (
    <div className="space-y-2 pt-1">
      {messages.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
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
          />
        ))
      )}
    </div>
  );
};

export default MessageList;