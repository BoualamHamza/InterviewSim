import React from 'react';

interface VoiceControlsProps {
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  interimTranscript?: string; // To display live speech results
}

const VoiceControls: React.FC<VoiceControlsProps> = ({ 
  isListening, 
  onStartListening, 
  onStopListening,
  interimTranscript
}) => {
  return (
    <div className="voice-controls">
      <h3>Voice Input</h3>
      <button onClick={onStartListening} disabled={isListening}>
        Start Listening
      </button>
      <button onClick={onStopListening} disabled={!isListening} style={{ marginLeft: '10px' }}>
        Stop Listening
      </button>
      {isListening && (
        <p style={{ color: 'green', marginTop: '10px', fontStyle: 'italic' }}>
          Listening... Speak now.
        </p>
      )}
      {interimTranscript && (
        <p style={{ color: '#555', marginTop: '10px', fontStyle: 'italic' }}>
          Partial: {interimTranscript}
        </p>
      )}
    </div>
  );
};

export default VoiceControls;
