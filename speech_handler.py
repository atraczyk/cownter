"""Speech recognition module for converting speech to text and text to speech."""

from typing import Optional, List

import speech_recognition as sr
import pyttsx3

class SpeechHandler:
    """Handles speech recognition and text-to-speech conversion."""

    def __init__(self):
        """Initialize speech recognition and text-to-speech engines."""
        self.recognizer = sr.Recognizer()
        self.ambient_duration = 0.2
        self.timeout = 5  # Timeout for waiting for speech

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

    def listen(self, timeout: Optional[float] = None) -> Optional[str]:
        """
        Listen for and recognize speech input.

        Args:
            timeout: How long to wait for speech input

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

                print(f"Listening... (timeout: {timeout or self.timeout} seconds)")
                # Listen for user input with timeout
                audio = self.recognizer.listen(mic, timeout=timeout or self.timeout)

                # Convert speech to text
                recognized_text = self.recognizer.recognize_google(audio).lower()
                return recognized_text

        except sr.RequestError as error:
            print(f"Speech recognition request failed: {error}")
            return None
        except sr.WaitTimeoutError:
            print("No speech detected within timeout period")
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

    def listen_for_list(self, num_items: int, prompt: str, item_name: str = "item") -> Optional[List[str]]:
        """
        Listen for a list of items one by one.

        Args:
            num_items: Number of items to collect
            prompt: Initial prompt to speak
            item_name: Name of items being collected for messages

        Returns:
            List[str]: List of recognized items if successful, None otherwise
        """
        self.speak(prompt)
        items = []
        hero_timeout = 3
        max_retries = 2

        print(f"Listening for {num_items} {item_name}s...")
        while len(items) < num_items:
            retries = max_retries
            while retries > 0:
                text = self.listen(timeout=hero_timeout)
                if text:
                    # Add the first word as item name
                    item = text.split()[0]
                    items.append(item)
                    print(f"{item_name.title()} {len(items)}: {item}")

                    if len(items) < num_items:
                        print(f"Say {item_name} {len(items) + 1}...")
                    break
                else:
                    retries -= 1
                    if retries > 0:
                        print(f"Didn't catch that. {retries} tries remaining for {item_name} {len(items) + 1}...")

            if not text:  # If we used all retries
                print(f"\nToo many failed attempts. Got {len(items)} {item_name}s: {', '.join(items)}")
                return None

        print(f"\nRecognized {item_name}s: {', '.join(items)}")
        return items


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
