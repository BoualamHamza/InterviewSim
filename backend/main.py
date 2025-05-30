from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, validator
from typing import Optional, Dict, List, Any
import requests
from bs4 import BeautifulSoup
import re
from enum import Enum
import logging
import os
from openai import AsyncOpenAI, OpenAIError
import json # For sending structured WebSocket messages

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- OpenAI Client Initialization ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_PLACEHOLDER"
    logger.warning("OPENAI_API_KEY environment variable not found. Using placeholder.")

if OPENAI_API_KEY == "YOUR_OPENAI_API_KEY_PLACEHOLDER" or not OPENAI_API_KEY:
    logger.warning("OpenAI API key is not configured correctly. LLM calls will likely fail.")
    client = None
else:
    try:
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize AsyncOpenAI client: {e}")
        client = None

# --- Constants ---
MAX_INTERVIEW_TURNS = 3 # Number of AI question + User response cycles

# --- Data Models ---
class JobDescriptionRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None

    @validator('url', always=True)
    def check_at_least_one_field(cls, v, values):
        if not v and not values.get('text'):
            raise ValueError('Either text or url must be provided')
        return v

class InterviewerRole(str, Enum):
    HR = "HR"
    TECHNICAL_MANAGER = "TECHNICAL_MANAGER"

class InterviewSetupRequest(BaseModel):
    job_description_text: str
    interviewer_role: InterviewerRole

# --- Global State (In-memory) ---
interview_sessions: Dict[str, Dict[str, Any]] = {}
DEFAULT_SESSION_ID = "default_session"

# --- Helper Functions ---
def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n+', '\n', text)
    return text.strip()

async def get_llm_response(session_data: Dict, conversation_history: List[Dict], prompt_type: str = "question") -> Optional[str]:
    if not client:
        logger.error("AsyncOpenAI client is not initialized.")
        return json.dumps({"type": "error", "content": "AI service is not configured."}) # Send JSON error

    interviewer_role = session_data["interviewer_role"]
    job_description_text = session_data["job_description"]
    
    system_message_content = f"You are an {interviewer_role} interviewer. The candidate is applying for a job with this description: {job_description_text}. "

    if prompt_type == "question":
        if not any(msg["role"] == "assistant" for msg in conversation_history): # First question
            system_message_content += "Start the interview by asking an appropriate first question. Be welcoming and engaging. Keep your question concise."
        else: # Follow-up question
            system_message_content += "Continue the interview based on the conversation history. Ask the next relevant question. Keep questions concise and avoid repeating prior questions."
    elif prompt_type == "feedback":
        system_message_content += (
            "The interview has now concluded. Based on the entire conversation history, "
            "provide a concise summary of the candidate's performance, highlighting their strengths and areas for improvement relevant to the job role. "
            "Structure your feedback with clear sections for 'Strengths' and 'Areas for Improvement'. Be constructive and specific."
        )
    else:
        logger.error(f"Unknown prompt type: {prompt_type}")
        return json.dumps({"type": "error", "content": "Invalid prompt type for AI."})


    messages_payload = [{"role": "system", "content": system_message_content}]
    messages_payload.extend([msg for msg in conversation_history if msg["role"] != "system"])

    try:
        logger.info(f"Sending prompt to OpenAI (type: {prompt_type}): System - '{system_message_content[:100]}...', History len - {len(conversation_history)}")
        completion = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages_payload,
            temperature=0.7 if prompt_type == "question" else 0.5, # Lower temp for feedback
            max_tokens=250 if prompt_type == "feedback" else 150
        )
        ai_response_text = completion.choices[0].message.content.strip()
        logger.info(f"Received response from OpenAI: {ai_response_text[:100]}...")
        
        if prompt_type == "feedback":
            return json.dumps({"type": "feedback", "content": ai_response_text})
        else: # question or other types if any
            return json.dumps({"type": "question", "content": ai_response_text})

    except OpenAIError as e:
        logger.error(f"OpenAI API error: {e}")
        error_detail = str(e)
        if "authentication" in error_detail.lower():
            error_message = "AI service configuration error (authentication)."
        else:
            error_message = "Error generating AI response."
        return json.dumps({"type": "error", "content": error_message, "detail": error_detail})
    except Exception as e:
        logger.error(f"Unexpected error in get_llm_response: {e}")
        return json.dumps({"type": "error", "content": "Unexpected error generating AI response."})

# --- API Endpoints ---
@app.post("/process-job-description/")
async def process_job_description_endpoint(request: JobDescriptionRequest):
    # This endpoint is less relevant now as JD is directly passed to /start-interview
    # but keeping it for potential future use or direct text cleaning.
    raw_text = ""
    # ... (existing logic from previous steps, simplified here for brevity) ...
    if request.text: raw_text = request.text
    elif request.url: raw_text = f"Content from {request.url}" # Placeholder
    cleaned_description = clean_text(raw_text)
    if not cleaned_description:
        raise HTTPException(status_code=400, detail="Cleaned text is empty.")
    return {"cleaned_description": cleaned_description}


@app.post("/start-interview/")
async def start_interview_endpoint(request: InterviewSetupRequest):
    session_id = DEFAULT_SESSION_ID # Using a fixed session ID for MVP
    interview_sessions[session_id] = {
        "job_description": request.job_description_text,
        "interviewer_role": request.interviewer_role.value,
        "interview_log": [], # Stores {"role": "user/assistant", "content": "message"}
        "turn_count": 0 # Initialize turn count
    }
    logger.info(f"Interview session {session_id} configured: Role - {request.interviewer_role.value}")
    return {
        "message": "Interview session configured",
        "session_id": session_id,
        "role": request.interviewer_role.value,
        "job_description_preview": request.job_description_text[:200]
    }

@app.websocket("/ws/interview/{session_id}")
async def websocket_interview_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for session_id: {session_id}")

    if session_id not in interview_sessions or not client:
        error_type = "session_not_found" if session_id not in interview_sessions else "ai_service_not_ready"
        error_msg = "Interview session not found." if error_type == "session_not_found" else "AI service not ready."
        logger.warning(f"{error_msg} Closing WebSocket for session {session_id}.")
        await websocket.send_text(json.dumps({"type": "error", "content": error_msg}))
        await websocket.close(code=1008 if error_type == "session_not_found" else 1011)
        return

    session_data = interview_sessions[session_id]
    current_interview_log: List[Dict[str, str]] = session_data["interview_log"]

    # Send initial question if log is empty
    if not current_interview_log:
        ai_response_json = await get_llm_response(session_data, [])
        await websocket.send_text(ai_response_json)
        response_data = json.loads(ai_response_json)
        if response_data.get("type") != "error":
             current_interview_log.append({"role": "assistant", "content": response_data["content"]})
        else: # Critical error on first question (e.g. OpenAI key)
            logger.error(f"Critical error on initial question for {session_id}: {response_data.get('content')}")
            await websocket.close(code=1011)
            return


    try:
        while True:
            received_text = await websocket.receive_text()
            logger.info(f"Received from {session_id} (user): {received_text[:100]}...")
            current_interview_log.append({"role": "user", "content": received_text})

            # Increment turn count (AI has asked, user has responded)
            # A turn is AI question + user response. AI asks first.
            # So, after user's first response, 1 turn is complete.
            # Number of assistant messages indicates number of questions asked.
            session_data["turn_count"] = sum(1 for msg in current_interview_log if msg["role"] == "assistant")
            logger.info(f"Session {session_id} - Turn count: {session_data['turn_count']}")


            if session_data["turn_count"] >= MAX_INTERVIEW_TURNS:
                logger.info(f"Max turns reached for session {session_id}. Generating feedback.")
                feedback_response_json = await get_llm_response(session_data, current_interview_log, prompt_type="feedback")
                await websocket.send_text(feedback_response_json)
                
                # Send end_interview control message
                await websocket.send_text(json.dumps({
                    "type": "control", 
                    "command": "end_interview", 
                    "message": "The interview has concluded. Feedback provided."
                }))
                logger.info(f"Feedback sent and interview ended for session {session_id}.")
                await websocket.close(code=1000) # Normal closure
                break 
            else:
                ai_response_json = await get_llm_response(session_data, current_interview_log, prompt_type="question")
                await websocket.send_text(ai_response_json)
                response_data = json.loads(ai_response_json)
                if response_data.get("type") != "error":
                    current_interview_log.append({"role": "assistant", "content": response_data["content"]})
                else: # Non-critical error during conversation, inform user
                    logger.warning(f"Error during question generation for {session_id}: {response_data.get('content')}")
                    # The error message itself is sent to the client by get_llm_response

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session_id: {session_id}")
    except Exception as e:
        logger.error(f"Error in WebSocket for session {session_id}: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "content": "An unexpected server error occurred."}))
            await websocket.close(code=1011)
        except Exception:
            pass # Avoid error cascades if sending fails

@app.get("/")
async def root():
    return {"message": "AI Interview Simulator Backend is running."}
