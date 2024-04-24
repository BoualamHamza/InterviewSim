import speech_recognition as sr
from gtts import gTTS
from pygame import mixer
from playsound import playsound
from openai import OpenAI
import os
import threading
import time

client = OpenAI(api_key='your ApiKey goes here')
messages_array = [{'role': 'assistant',
                   'content': 'You are a job interview simulator for backend development, simulate a real meeting with the applicant'}]


def listen():
    print('Listening...')
    r = sr.Recognizer()
    with sr.Microphone() as source:
        r.pause_threshold = 1
        audio = r.listen(source, timeout=5)

    try:
        print('Recognizing...')
        req = r.recognize_google(audio)
        print('User said:', req)
        messages_array.append({'role': 'user', 'content': req})
        threading.Thread(target=respond, args=(req,)).start()
    except sr.UnknownValueError:
        print('Speech Recognition could not understand audio')
    except sr.RequestError as e:
        print(f'Speech Recognition service request failed: {e}')


def respond(req):
    print('Responding...')
    res = client.chat.completions.create(
        model='gpt-3.5-turbo', messages=messages_array)
    res_message = res.choices[0].message.content
    print('Assistant:', res_message)
    messages_array.append({'role': 'assistant', 'content': res_message})
    threading.Thread(target=speak, args=(res_message,)
                     ).start()  # Speak asynchronously


def speak(text):
    if isinstance(text, str):
        speech = gTTS(text=text, lang='en', slow=False)
        speech.save('captured_voice.mp3')
        playsound('captured_voice.mp3')
        os.remove('captured_voice.mp3')
    else:
        print("Error: Text is not a string.")


def main():
    while True:
        listen()
        time.sleep(1)


if __name__ == "__main__":
    threading.Thread(target=main).start()
