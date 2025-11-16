import requests
from bs4 import BeautifulSoup
import re
import html
import json
import time as t
from datetime import datetime

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
}

all_challenges = []  # Store all challenge data here

# Fetch the latest challenge ID dynamically
response = requests.get("https://www.strava.com/challenges", headers=headers)
latest_id_match = re.search(r'\{&quot;id&quot;:(\d+),&quot;url&quot;:&quot;https://www\.strava\.com/challenges/', response.text)

if latest_id_match:
    latest_id = int(latest_id_match.group(1))
    start = latest_id - 100
    end = latest_id + 150
    print(f"Latest challenge ID found: {latest_id}", flush=True)
    print(f"Scanning from {start} to {end}", flush=True)
else:
    # Fallback to default values if unable to fetch
    start = 5097
    end = 5250
    print("Could not fetch latest challenge ID, using default range", flush=True)

for challenge_id in range(start, end):  # 5097 to 5250
    t.sleep(1)  # Rate limit: 1 request per second
    
    url = f"https://www.strava.com/challenges/{challenge_id}"
    response = requests.get(url, headers=headers, allow_redirects=False)

    if response.status_code == 302 and response.headers.get("Location") == "https://www.strava.com/challenges":
        # print(f"Challenge: {url} not found or expired.")
        continue

    soup = BeautifulSoup(response.text, 'html.parser')
    html_content = soup.prettify()
    decoded_html = html.unescape(html_content)

    challenge_data = {}

    # Canonical challenge URL
    challenge_url = re.search(r'<link href="(https://www\.strava\.com/challenges/[^"]+)" rel="canonical"/>', html_content)
    if challenge_url:
        challenge_data["challenge_url"] = challenge_url.group(1)

    # Cover image
    cover_url = re.search(r'coverImageUrl":"(https://[^"]+\.png)"', decoded_html)
    if cover_url:
        challenge_data["cover_url"] = cover_url.group(1)

    # Logo image
    logo_url = re.search(r'challengeLogoUrl":"(https://[^"]+\.png)"', decoded_html)
    if logo_url:
        challenge_data["logo_url"] = logo_url.group(1)

    # Name
    name = re.search(r'<meta content="([^"]+)" property="og:title"/>', html_content)
    if name:
        challenge_data["name"] = name.group(1)

    # Description
    description = re.search(r'<meta content="([^"]+)" property="og:description"/>', html_content)
    if description:
        challenge_data["description"] = description.group(1)

    # Time
    time_match = re.search(r'title&quot;:&quot;([A-Z][a-z]{2} \d{1,2}, \d{4}) to ([A-Z][a-z]{2} \d{1,2}, \d{4})(.*?)&quot;,&quot;icons', html_content)
    if time_match:
        start_date_str = time_match.group(1)
        end_date_str = time_match.group(2)
        suffix = time_match.group(3)

        # Time range
        challenge_data["time"] = f"{start_date_str} to {end_date_str}{suffix}"
        
        # Start date
        challenge_data["start_date"] = str(start_date_str)
        
        # End date
        challenge_data["end_date"] = str(end_date_str)
        
        # Challenge status
        if "days left" in suffix or "day left" in suffix:
            challenge_data["status"] = "running"
        elif "days until start" in suffix or "day until start" in suffix:
            challenge_data["status"] = "upcoming"
        else:
            challenge_data["status"] = "ended"

        # Calculate days
        try:
            start_date = datetime.strptime(start_date_str, "%b %d, %Y")
            end_date = datetime.strptime(end_date_str, "%b %d, %Y")
            challenge_days = (end_date - start_date).days + 1
            challenge_data["challenge_days"] = str(challenge_days)
        except ValueError as e:
            challenge_data["challenge_days"] = "unknown"


    # Task
    task = re.search(r'"title":"([^"]+)",\s*"subtitles"', decoded_html)
    if task:
        challenge_data["task"] = task.group(1)

    # Qualifying activities
    qa_match = re.search(r'text&quot;:&quot;Qualifying Activities: ([^"]+)&quot;,&quot;href&quot;:&quot;#qualifying-activities', html_content)
    if qa_match:
        activities = [activity.strip() for activity in qa_match.group(1).split(',')]
        challenge_data["tags"] = activities

    # Reward
    reward = re.search(r'reward&quot;:\{&quot;title&quot;:&quot;(.*?)&quot;,&quot;icons&quot;', html_content)
    if reward:
        challenge_data["reward"] = reward.group(1)

    # Club
    club = re.search(r'clubUrl&quot;:&quot;/(.*?)&quot;,&quot;verified', html_content)
    if club:
        challenge_data["club"] = "https://www.strava.com/" + club.group(1)
        
    # Participants
    participants = re.search(r';Participants&quot;,&quot;value&quot;:(.*?)}],&quot;auxiliaryStats', html_content)
    if participants:
        challenge_data["participants"] = participants.group(1)

    all_challenges.append(challenge_data)  # Add the challenge data to the list

# Output the entire list as formatted JSON
print(json.dumps(all_challenges, indent=3))


# python3 extract_info.py | tee strava_challenges.json