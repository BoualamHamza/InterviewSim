# InterviewSim
## Job Interview Simulator

This Python code simulates a job interview for backend development using speech recognition and natural language processing.
This is just a first version the code was written while feeling a bit drunk so you know what to do , also I am Fine-tunning the Mistral 7b LLM model to addapt to any type of job with some web scraping . The goal ---> the model can learn byitself about the company and positin that you are applying too and simulate a real human like interview. That's it Ciao 


 ### Requirements
- Python 3.x
- It is recommended to use a Python virtual environment.

### Setup
1. Create a virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    ```
2. Activate the virtual environment:
    - On Windows:
        ```bash
        venv\Scripts\activate
        ```
    - On macOS and Linux:
        ```bash
        source venv/bin/activate
        ```
3. Install the required libraries:
    ```bash
    pip install -r requirements.txt
    ```

### Usage
1. Replace `'your ApiKey goes here'` with your OpenAI API key.
2. Run the code.
3. The program will listen for your responses, simulate an interview, and respond accordingly.

### Features
- Simulates a job interview for backend development.
- Utilizes Google's Speech Recognition API to recognize user's speech.
- Uses OpenAI's GPT-3.5 model to generate responses.
- Generates synthesized speech using Google Text-to-Speech (gTTS).
- Plays the synthesized speech using the `playsound` module.

### How it works
1. The program listens to the user's speech using the microphone.
2. Recognizes the speech and sends it to the OpenAI API.
3. Generates a response using the GPT-3.5 model.
4. Synthesizes the response into speech using gTTS.
5. Plays the synthesized speech.

### Note
- Make sure to replace `'your ApiKey goes here'` with your actual OpenAI API key.
- Adjust the `model` parameter in the `respond()` function if needed.

### Example
```bash
python job_interview_simulator.py
```
The program will start listening for your responses.

---

**Note:** This is a basic version. More features are planned once the finetuning of Mistral 7B is completed.
