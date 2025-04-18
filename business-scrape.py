import requests
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import time
import random
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('business-scraper')

app = Flask(__name__)
# Configure CORS to allow requests from any origin with proper methods and headers
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Headers to make our requests look more like a regular browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.wilmingtonchamber.org/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',  # Do Not Track
    'Cache-Control': 'max-age=0',
}

# Cache for storing website URLs to reduce repeated requests
website_cache = {}

@app.route('/api/fetch-website', methods=['GET'])
def fetch_website():
    """
    Endpoint to fetch a business website URL from its Chamber of Commerce page.
    Query parameters:
    - url: The URL of the business's CoC page
    - name: The business name for logging and cache purposes
    """
    coc_url = request.args.get('url')
    business_name = request.args.get('name', 'Unknown business')
    
    if not coc_url:
        return jsonify({'error': 'No URL provided'}), 400
        
    # Check cache first
    if coc_url in website_cache:
        logger.info(f"Cache hit for {business_name}: {website_cache[coc_url]}")
        return jsonify({'website': website_cache[coc_url]})
    
    logger.info(f"Fetching website for {business_name} from {coc_url}")
    
    try:
        # Add a random delay to avoid triggering anti-scraping measures
        time.sleep(random.uniform(1, 3))
        
        # Make request to the business page
        response = requests.get(coc_url, headers=HEADERS, timeout=10)
        
        if response.status_code != 200:
            logger.error(f"Failed to fetch {coc_url}: Status code {response.status_code}")
            return jsonify({'error': f'Failed to fetch page: {response.status_code}'}), 500
            
        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        website_url = "n/a"
        found = False
        
        # Strategy 1: Look for links with website indicators in text or aria-label
        website_indicators = ["website", "visit site", "view site", "web", "site", "view our site"]
        for link in soup.find_all('a'):
            link_text = link.get_text().strip().lower()
            aria_label = link.get('aria-label', '').lower()
            href = link.get('href')
            
            if href and any(indicator in link_text or indicator in aria_label for indicator in website_indicators):
                website_url = href
                found = True
                logger.info(f"Found website for {business_name} via text matching: {website_url}")
                break
                
        # Strategy 2: Look for any external URLs that aren't social media or maps
        if not found:
            for link in soup.find_all('a'):
                href = link.get('href', '')
                if re.match(r'^https?://', href) and \
                   not any(domain in href for domain in ['google.com/maps', 'facebook.com', 'twitter.com',
                                                         'instagram.com', 'linkedin.com', 'youtube.com', 
                                                         'wilmingtonchamber.org']):
                    website_url = href
                    found = True
                    logger.info(f"Found likely website URL for {business_name}: {website_url}")
                    break
        
        # Cache the result
        website_cache[coc_url] = website_url
        
        return jsonify({'website': website_url})
        
    except Exception as e:
        logger.error(f"Error fetching website for {business_name}: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting business scraper API on port 5000")
    app.run(debug=True, port=5000)
