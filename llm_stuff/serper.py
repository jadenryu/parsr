import requests
import json
import asyncio
from crawl4ai import *

url = "https://google.serper.dev/search?q=apple+inc&apiKey=b2a719347945479e449681749ad9e8d759a9b225"

payload = {}
headers = {}

response = requests.request("GET", url, headers=headers, data=payload)

data = json.loads(response.text)
description = data['knowledgeGraph']['description']
print("Knowledge Graph Description:", description)

print("\nOrganic Results:")
for result in data.get('organic', []):
    print("Title:", result.get('title'))
    print("Snippet:", result.get('snippet'))
    print("Link:", result.get('link'))
    print("---")
browser_config = BrowserConfig(
    browser_mode="builtin",  # This is the key setting!
    headless=False           # Can be headless or not
)
async def main():
    async with AsyncWebCrawler(config = browser_config) as crawler:
        result = await crawler.arun(
            url="https://www.nbcnews.com/business",
        )
        print(result.markdown)

if __name__ == "__main__":
    asyncio.run(main())