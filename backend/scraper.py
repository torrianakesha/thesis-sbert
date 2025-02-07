import aiohttp
from bs4 import BeautifulSoup
import asyncio
from datetime import datetime
from typing import List, Dict

class DevpostScraper:
    BASE_URL = "https://devpost.com/hackathons"

    async def fetch_page(self, url: str) -> str:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                return await response.text()

    async def parse_hackathon(self, hackathon_element) -> Dict:
        try:
            title = hackathon_element.find('h3', class_='challenge-title').text.strip()
            description = hackathon_element.find('p', class_='challenge-description')
            description = description.text.strip() if description else ""
            
            # Get requirements
            requirements_div = hackathon_element.find('div', class_='requirements')
            requirements = [req.text.strip() for req in requirements_div.find_all('li')] if requirements_div else []

            # Get prize
            prize_div = hackathon_element.find('div', class_='prizes')
            prize = prize_div.text.strip() if prize_div else "No prize specified"

            # Get deadline
            deadline_div = hackathon_element.find('div', class_='deadline')
            deadline = deadline_div.text.strip() if deadline_div else "No deadline specified"

            # Get themes/keywords
            themes_div = hackathon_element.find('div', class_='themes')
            keywords = []
            if themes_div:
                keywords = [theme.strip() for theme in themes_div.text.split(',')]

            return {
                "title": title,
                "description": description,
                "requirements": requirements,
                "prize": prize,
                "criteria": "Check hackathon page for details",
                "deadline": deadline,
                "keywords": keywords,
                "full_text": f"""
                {description}
                Requirements: {', '.join(requirements)}
                Keywords: {', '.join(keywords)}
                """
            }
        except Exception as e:
            print(f"Error parsing hackathon: {e}")
            return None

    async def get_hackathons(self) -> List[Dict]:
        try:
            html = await self.fetch_page(self.BASE_URL)
            soup = BeautifulSoup(html, 'html.parser')
            
            hackathon_elements = soup.find_all('div', class_='challenge-listing')
            hackathons = []

            for element in hackathon_elements:
                hackathon = await self.parse_hackathon(element)
                if hackathon:
                    hackathons.append(hackathon)
            
            return hackathons
        except Exception as e:
            print(f"Error fetching hackathons: {e}")
            return []

    async def run(self):
        hackathons = await self.get_hackathons()
        for hackathon in hackathons:
            print(hackathon)

if __name__ == "__main__":
    scraper = DevpostScraper()
    asyncio.run(scraper.run())