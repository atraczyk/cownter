import pandas as pd

# List of Overwatch 2 heroes
heroes = ["D.Va", "Doomfist", "Junker Queen", "Orisa", "Reinhardt", "Roadhog", "Sigma", "Winston", "Wrecking Ball",
          "Zarya", "Ashe", "Bastion", "Cassidy", "Echo", "Genji", "Hanzo", "Junkrat", "Mei", "Pharah", "Reaper",
          "Sojourn", "Soldier: 76", "Sombra", "Symmetra", "Torbjörn", "Tracer", "Widowmaker", "Ana", "Baptiste",
          "Brigitte", "Kiriko", "Lúcio", "Mercy", "Moira", "Zenyatta"]

# Defining the roles for each hero in Overwatch 2
hero_roles = {
    "D.Va": "Tank",
    "Doomfist": "Tank",
    "Junker Queen": "Tank",
    "Orisa": "Tank",
    "Reinhardt": "Tank",
    "Roadhog": "Tank",
    "Sigma": "Tank",
    "Winston": "Tank",
    "Wrecking Ball": "Tank",
    "Zarya": "Tank",
    "Ashe": "Damage",
    "Bastion": "Damage",
    "Cassidy": "Damage",
    "Echo": "Damage",
    "Genji": "Damage",
    "Hanzo": "Damage",
    "Junkrat": "Damage",
    "Mei": "Damage",
    "Pharah": "Damage",
    "Reaper": "Damage",
    "Sojourn": "Damage",
    "Soldier: 76": "Damage",
    "Sombra": "Damage",
    "Symmetra": "Damage",
    "Torbjörn": "Damage",
    "Tracer": "Damage",
    "Widowmaker": "Damage",
    "Ana": "Support",
    "Baptiste": "Support",
    "Brigitte": "Support",
    "Kiriko": "Support",
    "Lúcio": "Support",
    "Mercy": "Support",
    "Moira": "Support",
    "Zenyatta": "Support"
}

# Creating a DataFrame for hero roles
hero_roles_df = pd.DataFrame(list(hero_roles.items()), columns=['Hero', 'Role'])

# Print the DataFrames
print("\nHero Roles:")
print(hero_roles_df)

# Defining the counters within the same cell to avoid the NameError
counters = {
    "D.Va": {"Sombra": 2, "Zarya": 2, "Roadhog": 2, "Junkrat": 2},
    "Doomfist": {"Reaper": 3, "Pharah": 2, "Genji": 2, "Echo": 2},
    "Junker Queen": {"Bastion": 3, "Zenyatta": 2, "Mei": 2, "Orisa": 2},
    "Orisa": {"Winston": 2, "Zenyatta": 2, "Junkrat": 2, "Reaper": 2},
    "Reinhardt": {"Reaper": 3, "Bastion": 3, "Pharah": 2, "Junkrat": 2},
    "Roadhog": {"Ana": 2, "Zarya": 2, "Widowmaker": 2, "Reaper": 2},
    "Sigma": {"Orisa": 2, "Reaper": 2, "Genji": 2, "Reinhardt": 2},
    "Winston": {"Roadhog": 3, "Ana": 2, "Junkrat": 2, "Moira": 2},
    "Wrecking Ball": {"Sombra": 3, "Reaper": 2, "Bastion": 2, "Pharah": 2},
    "Zarya": {"Pharah": 2, "Sombra": 2, "Zenyatta": 2, "Bastion": 2},
    "Ashe": {"Widowmaker": 2, "Hanzo": 2, "Tracer": 2, "Reinhardt": 1},
    "Bastion": {"Roadhog": 3, "Junkrat": 2, "Ana": 2, "Reaper": 2},
    "Cassidy": {"Widowmaker": 2, "Winston": 2, "Baptiste": 1, "Tracer": 2},
    "Echo": {"Widowmaker": 3, "Sojourn": 2, "Hanzo": 2, "Sombra": 2},
    "Genji": {"Pharah": 2, "Brigitte": 3, "Zarya": 2, "Ana": 2},
    "Hanzo": {"Widowmaker": 2, "Winston": 2, "Genji": 2, "D.Va": 1},
    "Junkrat": {"Pharah": 2, "Kiriko": 2, "Echo": 2, "Widowmaker": 3},
    "Mei": {"Pharah": 2, "Sombra": 2, "Widowmaker": 2, "Soldier: 76": 1},
    "Pharah": {"Widowmaker": 3, "Hanzo": 2, "Sojourn": 2, "Soldier: 76": 2},
    "Reaper": {"Widowmaker": 3, "Echo": 2, "Pharah": 2, "Zenyatta": 2},
    "Sojourn": {"Winston": 2, "Zarya": 2, "Widowmaker": 2, "Lúcio": 1},
    "Soldier: 76": {"Roadhog": 2, "Winston": 2, "Genji": 2, "Sigma": 1},
    "Sombra": {"Hanzo": 2, "Junkrat": 2, "Widowmaker": 2, "Tracer": 2},
    "Symmetra": {"D.Va": 2, "Pharah": 2, "Winston": 2, "Junker Queen": 1},
    "Torbjörn": {"Pharah": 2, "Widowmaker": 2, "Ana": 2, "Echo": 1},
    "Tracer": {"Winston": 3, "Brigitte": 2, "Pharah": 2, "Torbjörn": 1},
    "Widowmaker": {"Winston": 3, "Wrecking Ball": 2, "Sojourn": 2, "Reinhardt": 1},
    "Ana": {"D.Va": 2, "Widowmaker": 3, "Junker Queen": 2, "Tracer": 2},
    "Baptiste": {"D.Va": 2, "Genji": 3, "Hanzo": 2, "Roadhog": 2},
    "Brigitte": {"Bastion": 2, "Pharah": 2, "Junkrat": 2, "Hanzo": 1},
    "Kiriko": {"Widowmaker": 3, "Sombra": 2, "Sojourn": 2, "Tracer": 2},
    "Lúcio": {"Pharah": 2, "Torbjörn": 1, "Moira": 1, "Bastion": 2},
    "Mercy": {"Widowmaker": 3, "Winston": 2, "Roadhog": 2, "Sojourn": 2},
    "Moira": {"Widowmaker": 3, "Sombra": 2, "Wrecking Ball": 2, "Winston": 2},
    "Zenyatta": {"Junker Queen": 2, "Winston": 3, "Widowmaker": 3, "Genji": 2}
}

# Initialize a DataFrame with zeros
counter_matrix = pd.DataFrame(0, index=heroes, columns=heroes)

# Populate the DataFrame based on the counters dictionary
for hero, hero_counters in counters.items():
    for counter in hero_counters:
        counter_matrix.at[counter, hero] = 1

# Print the DataFrames
print("\nCounter Matrix:")
print(counter_matrix)