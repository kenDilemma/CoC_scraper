// Configuration file for the CoC scraper
// This file contains environment-specific configurations

// Function to determine if we're in production (GitHub Pages) or development
const isProd = () => {
  return import.meta.env.PROD;
};

const config = {
  // Base API URLs for the chambers of commerce (without CORS proxy)
  apiBaseUrls: {
    // For Wilmington Chamber of Commerce
    wilmington: 'https://www.wilmingtonchamber.org',
    
    // For Dayton Chamber of Commerce
    dayton: 'https://www.daytonareachamberofcommerce.growthzoneapp.com',

    // Direct GrowthZone API endpoints
    dayton_api: 'https://chambermaster.blob.core.windows.net/userfiles/UserFiles/chambers/1273',
  },

  // CORS proxy configuration - we'll use a more reliable one
  corsProxy: 'https://api.allorigins.win/raw?url=',
  
  // List of backup proxies if the main one fails
  alternateProxies: [
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://proxy.cors.sh/',
    'https://cors.eu.org/',
  ],
  
  // New JSONP service that avoids CORS issues
  jsonpService: 'https://api.allorigins.win/get?url=',
  jsonpCallback: '&callback=handleJSONP',

  // Debug mode - set to true to enable detailed logging
  debug: true
};

export default config;