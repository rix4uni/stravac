import requests
from bs4 import BeautifulSoup
import re
import html
import json
import time as t

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
}

all_challenges = []  # Store all challenge data here

start = 5097
end = 5250

for challenge_id in range(start, end):  # 5097 to 5099
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

    # Time range
    time = re.search(r'title&quot;:&quot;([A-Z][a-z]{2} \d{1,2}, \d{4} to [A-Z][a-z]{2} \d{1,2}, \d{4})', html_content)
    if time:
        challenge_data["time"] = time.group(1)

    # Task
    task = re.search(r'"title":"([^"]+)",\s*"subtitles"', decoded_html)
    if task:
        challenge_data["task"] = task.group(1)

    # Qualifying activities
    qa_match = re.search(r'text&quot;:&quot;Qualifying Activities: ([^"]+)&quot;,&quot;href&quot;:&quot;#qualifying-activities', html_content)
    if qa_match:
        activities = [activity.strip() for activity in qa_match.group(1).split(',')]
        challenge_data["qualifying_activities"] = activities

    # Reward
    reward = re.search(r'reward&quot;:\{&quot;title&quot;:&quot;(.*?)&quot;,&quot;icons&quot;', html_content)
    if reward:
        challenge_data["reward"] = reward.group(1)

    # Club
    club = re.search(r'"(http://strava\.com/clubs/[^"]+)"', decoded_html)
    if club:
        challenge_data["club"] = club.group(1).rstrip('\\')

    all_challenges.append(challenge_data)  # Add the challenge data to the list

# Output the entire list as formatted JSON
print(json.dumps(all_challenges, indent=3))


# python3 extract_info.py | unew strava_challenges.json