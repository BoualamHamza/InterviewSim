import React, { useState } from 'react';

interface JobDescriptionInputProps {
  onJobDescriptionSubmit: (text: string, url: string) => void; // Placeholder for now
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({ onJobDescriptionSubmit }) => {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    // Basic validation: ensure at least one is filled, or handle in parent/backend
    if (!text && !url) {
      alert('Please provide either job description text or a URL.');
      return;
    }
    onJobDescriptionSubmit(text, url);
    // setText(''); // Optionally clear after submit
    // setUrl('');
  };

  return (
    <div className="job-description-input">
      <h3>Job Description</h3>
      <textarea
        rows={10}
        cols={50}
        placeholder="Paste job description text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p>OR</p>
      <input
        type="text"
        placeholder="Enter job description URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: 'calc(100% - 22px)', marginBottom: '10px' }}
      />
      <button onClick={handleSubmit}>Process Job Description</button>
    </div>
  );
};

export default JobDescriptionInput;
