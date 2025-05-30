import React from 'react';

interface FeedbackDisplayProps {
  feedbackSummary: string | null;
  onStartNewInterview: () => void;
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedbackSummary, onStartNewInterview }) => {
  if (!feedbackSummary) {
    return (
      <div className="feedback-display">
        <h2>Interview Ended</h2>
        <p>Loading feedback...</p>
        <button onClick={onStartNewInterview} style={{ marginTop: '20px' }}>Start New Interview</button>
      </div>
    );
  }

  // Basic formatting for strengths and areas for improvement
  // This is a simple approach; more complex parsing might be needed for rich text.
  const formatFeedback = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      if (paragraph.toLowerCase().startsWith('strengths:')) {
        return <h4 key={index} style={{ marginTop: '15px', marginBottom: '5px', color: '#27ae60' }}>{paragraph}</h4>;
      }
      if (paragraph.toLowerCase().startsWith('areas for improvement:')) {
        return <h4 key={index} style={{ marginTop: '15px', marginBottom: '5px', color: '#e67e22' }}>{paragraph}</h4>;
      }
      return <p key={index} style={{ marginBottom: '10px', lineHeight: '1.6' }}>{paragraph}</p>;
    });
  };


  return (
    <div className="feedback-display" style={{ textAlign: 'left', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '20px' }}>Interview Feedback</h2>
      <div className="feedback-content">
        {formatFeedback(feedbackSummary)}
      </div>
      <button 
        onClick={onStartNewInterview} 
        style={{ 
          display: 'block', 
          margin: '30px auto 10px auto', 
          padding: '12px 25px', 
          fontSize: '1.1em',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Start New Interview
      </button>
    </div>
  );
};

export default FeedbackDisplay;
