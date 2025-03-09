"""Setup script for the Overwatch 2 Counter Picker package."""

from setuptools import setup, find_packages

setup(
    name="ow2-counters",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "pandas>=2.0.0",
        "requests>=2.31.0",
        "beautifulsoup4>=4.12.0",
        "SpeechRecognition>=3.10.0",
        "pyaudio>=0.2.14",
        "pyttsx3>=2.90",
        "flask>=3.0.0",
    ],
    python_requires=">=3.10",
)