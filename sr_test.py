"""Speech recognition module for converting speech to text and text to speech."""

import speech_recognition as sr
import pyttsx3


class SpeechHandler:
    """Handles speech recognition and text-to-speech conversion."""

    def __init__(self):
        """Initialize speech recognition and text-to-speech engines."""
        self.recognizer = sr.Recognizer()
        self.ambient_duration = 0.2

        self.speech_engine = pyttsx3.init()
        # Initialize text-to-speech engine to use Zira voice
        voices = self.speech_engine.getProperty('voices')
        for voice in voices:
            if "Zira" in voice.name:
                self.speech_engine.setProperty('voice', voice.id)
                break


    def speak(self, text):
        """
        Convert text to speech and speak it.

        Args:
            text: String to be spoken
        """
        self.speech_engine.say(text)
        self.speech_engine.runAndWait()

    def listen(self):
        """
        Listen for and recognize speech input.

        Returns:
            str: Recognized text, or None if recognition failed
        """
        try:
            with sr.Microphone() as mic:
                # Adjust for ambient noise
                self.recognizer.adjust_for_ambient_noise(
                    mic,
                    duration=self.ambient_duration
                )

                # Listen for user input
                audio = self.recognizer.listen(mic)

                # Convert speech to text
                recognized_text = self.recognizer.recognize_google(audio).lower()
                return recognized_text

        except sr.RequestError as error:
            print(f"Speech recognition request failed: {error}")
            return None

        except sr.UnknownValueError:
            # Ignore unrecognized speech
            return None

    def process_speech(self):
        """Process one iteration of speech recognition and response."""
        recognized_text = self.listen()
        if recognized_text:
            print(f"-: {recognized_text}")
            self.speak(recognized_text)


def main():
    """Main loop for speech recognition application."""
    handler = SpeechHandler()

    print("Listening for speech... (Ctrl+C to exit)")
    try:
        while True:
            handler.process_speech()
    except KeyboardInterrupt:
        print("\nExiting...")


if __name__ == "__main__":
    main()
