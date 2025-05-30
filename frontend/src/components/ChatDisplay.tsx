import React from 'react';

export interface Message {
  speaker: "AI" | "You";
  text: string;
  timestamp?: string; // Optional timestamp
}

interface ChatDisplayProps {
  messages: Message[];
}

const ChatDisplay: React.FC<ChatDisplayProps> = ({ messages }) => {
  return (
    <div className="chat-display">
      <h3>Interview Conversation</h3>
      <div className="message-list" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
        {messages.length === 0 && <p>Your interview will appear here...</p>}
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.speaker.toLowerCase()}`}>
            <p><strong>{msg.speaker}:</strong> {msg.text}</p>
            {msg.timestamp && <span style={{ fontSize: '0.8em', color: '#888' }}>{msg.timestamp}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatDisplay;
