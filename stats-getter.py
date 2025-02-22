import requests
from bs4 import BeautifulSoup

def get_best_heroes(battletag):
    tag = battletag.replace("#", "-")  # Convert # to - for URL
    url = f"https://playoverwatch.com/en-us/career/pc/{tag}"
    response = requests.get(url, timeout=10)  # Add 10 second timeout
    soup = BeautifulSoup(response.text, 'html.parser')

    heroes = {}
    for hero_section in soup.find_all('div', class_='progress-category'):
        hero_name = hero_section.find('div', class_='ProgressBar-title').text.strip()
        time_played = hero_section.find('div', class_='ProgressBar-description').text.strip()
        heroes[hero_name] = time_played

    return heroes

battletag = "NewDingFlow#1609"
hero_stats = get_best_heroes(battletag)
print(hero_stats)

# https://playoverwatch.com/en-us/career/pc/NewDingFlow-1609