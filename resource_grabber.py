import os
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

# URL of the official Overwatch heroes page
URL = "https://overwatch.blizzard.com/en-us/heroes"

# Create a folder to store the images
OUTPUT_FOLDER = "resources"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def load_hero_data():
    """Load hero data from JSON file."""
    with open('hero_data.json', 'r') as f:
        return json.load(f)

def is_valid_image_url(url: str) -> bool:
    """Check if URL is a valid image URL."""
    if not url or url.startswith('data:'):
        return False

    # Check if URL is from Blizzard CDN and contains an image
    parsed = urlparse(url)
    return ('cloudfront.net' in parsed.netloc and
            any(ext in parsed.path.lower() for ext in ['.png', '.jpg', '.jpeg']))

def get_hero_icons():
    """Download hero icons from the official Overwatch site."""
    # Load hero data
    hero_data = load_hero_data()
    hero_names = set(hero_data.keys())
    print(f"Looking for icons for {len(hero_names)} heroes")

    # Get page content
    response = requests.get(URL)
    soup = BeautifulSoup(response.text, "html.parser")

    # Find all hero cards
    hero_cards = soup.find_all("blz-hero-card")
    print(f"Found {len(hero_cards)} hero cards")

    # Track which heroes we've found icons for
    found_heroes = set()

    for card in hero_cards:
        # Get hero ID from the card (this is Blizzard's normalized name)
        hero_id = card.get('data-hero-id')
        if not hero_id:
            continue

        # Find the portrait image
        portrait = card.find("blz-image", class_="heroCardPortrait")
        if not portrait:
            continue

        # Get the image URL
        img_url = portrait.get('src')
        if not img_url or not is_valid_image_url(img_url):
            continue

        # Convert hero-id to our normalized format (e.g., 'soldier-76' -> 'soldier76')
        hero_name = hero_id.replace('-', '')

        # Check if this is a hero we need
        if hero_name not in hero_names:
            print(f"Skipping unknown hero: {hero_name} (from {hero_id})")
            continue

        found_heroes.add(hero_name)

        # Create normalized filename
        img_name = f"icon-{hero_name}.png"
        img_path = os.path.join(OUTPUT_FOLDER, img_name)

        print(f"Downloading icon for {hero_name} from {img_url}")

        try:
            # Download and save the image
            response = requests.get(img_url)
            response.raise_for_status()

            with open(img_path, "wb") as f:
                f.write(response.content)
            print(f"Successfully saved {img_name}")

        except requests.exceptions.RequestException as e:
            print(f"Error downloading {img_name}: {e}")

    # Report on missing icons
    missing_heroes = hero_names - found_heroes
    if missing_heroes:
        print("\nWarning: Could not find icons for these heroes:")
        for hero in sorted(missing_heroes):
            print(f"- {hero}")

    print(f"\nDownload complete! Found {len(found_heroes)} of {len(hero_names)} hero icons")

def main():
    get_hero_icons()

if __name__ == "__main__":
    main()
