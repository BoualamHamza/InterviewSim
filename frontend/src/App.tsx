import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import JobDescriptionInput from './components/JobDescriptionInput';
import RoleSelection, { InterviewRole } from './components/RoleSelection';
import ChatDisplay, { Message } from './components/ChatDisplay';
import VoiceControls from './components/VoiceControls';
import FeedbackDisplay from './components/FeedbackDisplay'; // Import new component

// --- Speech Recognition Setup ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition: SpeechRecognition | null = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
} else {
  console.warn("Speech Recognition API not supported in this browser.");
}

type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

function App() {
  // Config State
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState('');
  const [processedJobDescription, setProcessedJobDescription] = useState('');
  const [selectedRole, setSelectedRole] = useState<InterviewRole>(InterviewRole.HR);

  // App State
  const [appPhase, setAppPhase] = useState<'config' | 'interview' | 'feedback'>('config');
  const [messages, setMessages] = useState<Message[]>([
    { speaker: 'AI', text: 'Welcome! Configure the job and role, then click "Start Interview".', timestamp: new Date().toLocaleTimeString() },
  ]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [feedbackSummary, setFeedbackSummary] = useState<string | null>(null);


  // WebSocket State
  const ws = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Voice Interaction State
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [sttError, setSttError] = useState('');
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);


  const speak = useCallback((text: string) => {
    if (!isTTSEnabled || !('speechSynthesis' in window) || speechSynthesis.speaking) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }, [isTTSEnabled]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.speaker === 'AI' && appPhase === 'interview') { // Only speak during interview phase for AI messages
        speak(lastMessage.text);
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, speak, appPhase]);


  const connectWebSocket = useCallback((sId: string) => {
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) return;
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/interview/${sId}`;
    // const wsUrl = `${wsProtocol}//localhost:8000/ws/interview/${sId}`; // For local dev with different ports

    ws.current = new WebSocket(wsUrl);
    setWsStatus('connecting');

    ws.current.onopen = () => {
      setWsStatus('connected');
      setAppPhase('interview');
      // Backend sends first question automatically
    };

    ws.current.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      try {
        const messageData = JSON.parse(event.data);
        
        if (messageData.type === "question") {
          setMessages(prev => [...prev, { speaker: 'AI', text: messageData.content, timestamp: new Date().toLocaleTimeString() }]);
        } else if (messageData.type === "feedback") {
          setFeedbackSummary(messageData.content);
          setAppPhase('feedback'); // Switch to feedback phase
          // AI voice should not read the feedback summary automatically, user can read it.
        } else if (messageData.type === "control" && messageData.command === "end_interview") {
          setMessages(prev => [...prev, { speaker: 'AI', text: messageData.message, timestamp: new Date().toLocaleTimeString() }]);
          setAppPhase('feedback'); // Ensure phase is feedback
          if (ws.current) ws.current.close(1000); // Client acknowledges end, can close.
        } else if (messageData.type === "error") {
           setMessages(prev => [...prev, { speaker: 'AI', text: `Error from AI service: ${messageData.content}`, timestamp: new Date().toLocaleTimeString() }]);
        } else {
           // Fallback for unexpected message structure if it's simple text
           setMessages(prev => [...prev, { speaker: 'AI', text: event.data, timestamp: new Date().toLocaleTimeString() }]);
        }

      } catch (error) {
        console.error("Error parsing WebSocket message or unexpected format:", error);
         // If parsing fails, but it's a simple string, assume it's an AI question/statement
        if (typeof event.data === 'string') {
            setMessages(prev => [...prev, { speaker: 'AI', text: event.data, timestamp: new Date().toLocaleTimeString() }]);
        }
      }
    };

    ws.current.onerror = (event) => {
      console.error("WebSocket error:", event);
      setWsStatus('error');
      setMessages(prev => [...prev, { speaker: 'AI', text: "Connection error with interview service. Please try again.", timestamp: new Date().toLocaleTimeString() }]);
      setAppPhase('config'); // Or 'feedback' if appropriate
    };

    ws.current.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setWsStatus('disconnected');
      if (appPhase === 'interview') { // If interview was active and not naturally ended by feedback
        setMessages(prev => [...prev, { speaker: 'AI', text: "Interview connection lost.", timestamp: new Date().toLocaleTimeString() }]);
        setAppPhase('feedback'); // Move to feedback/end screen
      }
    };
  }, [appPhase]); // Re-run if appPhase changes (e.g. to allow re-connection if that was a feature) - careful with this dependency

  const closeWebSocket = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close(1000, "User ended interview");
    }
    ws.current = null; // Clear the ref
  }, []);

  useEffect(() => { // Cleanup WebSocket on component unmount
    return () => {
      closeWebSocket();
      // also stop speech synthesis if it's speaking
      if ('speechSynthesis' in window && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, [closeWebSocket]);

  useEffect(() => { // STT event handlers setup
    if (!recognition) return;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setInterimTranscript(interim);
      if (final) {
        const finalText = final.trim();
        setMessages(prev => [...prev, { speaker: 'You', text: finalText, timestamp: new Date().toLocaleTimeString() }]);
        setInterimTranscript('');
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(finalText);
        } else {
          setMessages(prev => [...prev, { speaker: 'AI', text: "(Message not sent - no connection)", timestamp: new Date().toLocaleTimeString() }]);
        }
      }
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setSttError(`STT Error: ${event.error} - ${event.message}. Mic access?`);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    return () => { // Cleanup STT
        if (recognition) {
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            if (isListening) recognition.stop();
        }
    };
  }, [isListening]); // Only re-bind if isListening changes, or recognition instance itself

  const handleJobDescriptionSubmit = (text: string, url: string) => {
    if (!text && !url) { /* ... */ return; }
    setProcessedJobDescription(text || `JD from URL: ${url}`);
    setJobDescriptionText(text); 
    setJobDescriptionUrl(url);
    alert("Job description captured. Select role and click 'Start Interview'.");
    setMessages(prev => [{speaker: "AI", text: "Job description ready. Confirm role and start.", timestamp: new Date().toLocaleTimeString()}]);
  };

  const handleStartInterview = async () => {
    if (!processedJobDescription) { /* ... */ return; }
    const payload = { job_description_text: processedJobDescription, interviewer_role: selectedRole };
    try {
      setWsStatus('connecting');
      setFeedbackSummary(null); // Clear previous feedback
      setMessages([{ speaker: 'AI', text: 'Setting up interview...', timestamp: new Date().toLocaleTimeString() }]); // Clear old messages
      const response = await fetch('/start-interview/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error ${response.status}`);
      }
      const data = await response.json();
      setSessionId(data.session_id);
      setMessages(prev => [...prev, { speaker: 'AI', text: `Session ${data.session_id} ready. Connecting...`, timestamp: new Date().toLocaleTimeString() }]);
      connectWebSocket(data.session_id);
    } catch (error) {
      console.error("Failed to start interview session:", error);
      setMessages(prev => [...prev, {speaker: "AI", text: `Error starting: ${error}. Try again.`, timestamp: new Date().toLocaleTimeString()}]);
      setWsStatus('error');
      setAppPhase('config');
    }
  };

  const handleStartListening = () => {
    if (!recognition || isListening || appPhase !== 'interview') return; // Prevent listening if not in interview
    try {
      setSttError('');
      recognition.start();
      setIsListening(true);
    } catch (e) { /* ... */ }
  };

  const handleStopListening = () => {
    if (!recognition || !isListening) return;
    recognition.stop();
  };
  
  const handleStartNewInterview = () => {
    closeWebSocket(); // Ensure old connection is closed
    if (recognition && isListening) recognition.stop();
    setAppPhase('config');
    setMessages([{ speaker: 'AI', text: 'Welcome! Configure the job and role, then click "Start Interview".', timestamp: new Date().toLocaleTimeString() }]);
    setSessionId(null);
    setWsStatus('disconnected');
    setFeedbackSummary(null);
    setProcessedJobDescription(''); // Clear old JD
    setJobDescriptionText('');
    setJobDescriptionUrl('');
  };

  // Determine if voice controls should be active
  const voiceControlsActive = appPhase === 'interview' && wsStatus === 'connected';


  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Interview Simulator</h1>
        <div className="controls-container">
            {appPhase !== 'config' && ( // Show TTS toggle if not in pure config mode
            <label className="tts-toggle">
                <input type="checkbox" checked={isTTSEnabled} onChange={() => setIsTTSEnabled(!isTTSEnabled)} />
                AI Voice
            </label>
            )}
            <p className={`ws-status ws-status-${wsStatus}`}>● {wsStatus}</p>
        </div>
      </header>

      <main className="App-main">
        {appPhase === 'config' && (
          <section className="config-section">
            <h2>Setup Your Interview</h2>
            <JobDescriptionInput onJobDescriptionSubmit={handleJobDescriptionSubmit} />
            <RoleSelection selectedRole={selectedRole} onRoleChange={setSelectedRole} />
            <button onClick={handleStartInterview} className="start-interview-btn" 
                    disabled={!processedJobDescription || wsStatus === 'connecting'}>
              {wsStatus === 'connecting' ? 'Setting up...' : 'Start Interview'}
            </button>
          </section>
        )}

        {appPhase === 'interview' && (
          <section className="interview-section">
            <div className="interview-header">
                <h3>Interview: {selectedRole}</h3>
                {sessionId && <p className="session-id">Session: {sessionId}</p>}
            </div>
            <ChatDisplay messages={messages} />
            <div ref={messagesEndRef} />
            <VoiceControls
                isListening={isListening}
                onStartListening={handleStartListening}
                onStopListening={handleStopListening}
                interimTranscript={interimTranscript}
                disabled={!voiceControlsActive} // Disable if not connected or interview not active
            />
            {sttError && <p className="stt-error">{sttError}</p>}
            <button onClick={handleStartNewInterview} className="end-interview-btn"> 
              End Interview & Reset
            </button>
          </section>
        )}

        {appPhase === 'feedback' && (
          <section className="feedback-section">
             <FeedbackDisplay feedbackSummary={feedbackSummary} onStartNewInterview={handleStartNewInterview} />
          </section>
        )}
      </main>

      <footer className="App-footer">
        <p>&copy; 2024 AI Interview Simulator {SpeechRecognition ? '(Voice Supported)' : '(Voice Not Supported)'}</p>
      </footer>
    </div>
  );
}

export default App;
