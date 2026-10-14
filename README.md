# Overwatch 2 Counter Picker

A tool to analyze Overwatch 2 hero counter relationships and suggest optimal team compositions.

## Features

- Analyze hero counter relationships
- Suggest optimal team compositions based on enemy team
- Show detailed team statistics including synergies
- Voice input support for enemy team composition
- Web interface

## Project Structure

```
ow2-counters/
├── main.py                 # Main entry point
├── src/                    # Source code
│   ├── core/               # Core functionality
│   │   ├── counter_analyzer.py
│   │   └── hero_data.json
│   ├── web/                # Web server
│   │   └── server.py
│   ├── voice/              # Voice recognition
│   │   ├── speech_handler.py
│   │   └── voice_handler.py
│   └── utils/              # Utility functions
│       └── utils.py
├── resources/              # Static resources (images, CSS, JS)
├── templates/              # HTML templates
└── tests/                  # Test suite
```

## Requirements

- Python 3.10+
- BeautifulSoup4
- requests
- pandas
- SpeechRecognition (for voice input)
- pyaudio (for voice input)
- pyttsx3 (for voice output)
- flask (for web interface)

## Installation

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows use .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Command Line Interface

```bash
# Show counters for a single hero
python main.py --heroes reinhardt

# Suggest counters for an enemy team
python main.py --heroes "reinhardt,genji,tracer,mercy,lucio"

# Show detailed team stats
python main.py --heroes "reinhardt,genji,tracer,mercy,lucio" --stats

# List all available heroes
python main.py --list-heroes

# Use voice input
python main.py --listen
```

### Web Interface

The counter picker page is a TypeScript client. Flask serves the API and hero icons.

```bash
# Start the API
python main.py --serve

# Install and start the TypeScript UI
npm install
npm start
```

Open `http://localhost:3000`. `npm test` runs the client tests and `npm run build` typechecks and builds the page.

### Maps and comp types

Pick a mode (Control, Escort, Hybrid, Push, Flashpoint, Clash), a map and the point you are playing. For Escort and Hybrid, also pick whether you are attacking or defending. Each point favours a mix of dive, poke and brawl. Suggestions then get a map-fit bonus on top of counters and synergy, and the comp read triangle shows where the point, your team and the enemy team sit.

## Data sheets

The comp-type data lives in versioned JSON sheets in `src/core/data/`:

- `archetypes.json`: dive/poke/brawl weights per hero
- `maps.json`: modes, maps and per-point (and per-side) comp preference
- `CHANGELOG.md`: version history for both sheets

Each sheet carries a semver `version`, an `updated` date and a `status` of `llm-draft` or `reviewed`. The page shows the map data version in the header. After editing a sheet, run:

```bash
python tools/validate_data.py
```

The project skill `.cursor/skills/ow2-data-sheets/SKILL.md` describes the workflow for drafting, reviewing and versioning these sheets with an LLM.

## Testing

The project includes a comprehensive test suite. To run the tests:

```bash
# Run all tests
python tests/run_all.py

# Run tests with coverage
python tests/run_with_coverage.py
```

Current test coverage:
- src/core/counter_analyzer.py: 91%
- src/utils/utils.py: 54%

For more details on testing, see [tests/README.md](tests/README.md).

## Building Executable

```bash
pyinstaller --onefile --icon=ow2.ico --name="compinator" main.py
```

## Resource Management

To download hero icons from the official Overwatch website:

```bash
python tools/resource_grabber.py
```


