# Stats
Simple scripts to scrape the stats of Overwatch 2 heroes from the official website,
and then use them to create a simple hero counter picker.

## Requirements

- Python 3.10+
- BeautifulSoup4
- requests
- pandas

## Installation and venv

```bash
python -m venv .venv
source .venv/bin/activate # on Windows use .venv\Scripts\activate
pip install -r requirements.txt
```

## Usage

```bash
python stats/stats-getter.py
```

```bash
python counter.py
```
