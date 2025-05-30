# 🗣️ AI Interview Simulator

## 🚀 Project Overview

**AI Interview Simulator** is a web-based platform that helps job applicants practice for real interviews by simulating voice-based conversations with an AI interviewer.

Users can submit a job description (by link or by pasting text), choose the type of interviewer (HR or Technical Manager), and begin a **voice-driven** mock interview powered by **large language models (LLMs)**.

---

## 🎯 Key Features (MVP)

* **🎤 Voice-Based Interaction**
  Users speak their answers and hear the AI's questions via speech-to-text and text-to-speech integration.

* **📄 Job Description Input**
  Input the job description by pasting text or providing a URL to the job post (we'll extract and parse the content).

* **🧑‍💼 Interviewer Role Selection**
  Choose the role of the AI interviewer:

  * HR Interviewer (focus: behavioral, soft skills, background)
  * Technical Manager (focus: coding, systems, technical depth)

* **🧠 AI-Powered Conversations**
  Conversations are powered by LLMs like OpenAI GPT-4 or Claude, with context taken from the job description.

---

## 🏗️ Tech Stack (Planned)

| Layer             | Tech Used                                     |
| ----------------- | --------------------------------------------- |
| **Frontend**      | React + TypeScript                            |
| **Voice I/O**     | Web Speech API / Whisper API / ElevenLabs     |
| **Backend**       | Python (FastAPI or Flask)                     |
| **LLM**           | OpenAI GPT-4 / Claude / Local LLMs via Ollama |
| **Communication** | WebSockets for real-time interaction          |
| **Database**      | SQLite (MVP) or PostgreSQL                    |

---

## 🎤 MVP Workflow

1. **User provides job description**

   * Paste job post OR
   * Paste a link (we scrape content)
2. **User selects AI interviewer type**

   * HR or Technical
3. **Interview begins**

   * AI greets user and starts asking questions (via voice)
   * User responds by speaking
   * AI uses LLM to generate follow-ups in real-time
4. **Session ends**

   * Optional: Summary of strengths/weaknesses (basic feedback)

---

## 🧩 Implementation Plan

### ✅ Phase 1 – Core MVP (Voice Interview)

* [ ] Input:

  * [ ] Job description: paste or fetch via link
  * [ ] Role selection (HR vs Technical)
* [ ] Voice Interaction:

  * [ ] Speech-to-text (User to AI)
  * [ ] Text-to-speech (AI to User)
* [ ] LLM Integration:

  * [ ] Pass job post + role context to LLM
  * [ ] Generate dynamic questions
* [ ] Real-time UI:

  * [ ] Display both voice and text messages
* [ ] Basic Feedback:

  * [ ] End-of-session summary

---

## 🧪 Stretch Goals (Post-MVP)

* Feedback scoring and dashboards
* Support for multiple languages
* Recordings and transcripts
* User login & history tracking
* Live coding or system design mode

---

## 🛠 Setup (coming soon)

Instructions for local development, LLM API setup, and voice libraries will be added once the scaffolding is ready.

---

## 🤝 Contributing

We welcome collaborators! Stay tuned for open issues and contribution guidelines.

---

## 📜 License

MIT License
