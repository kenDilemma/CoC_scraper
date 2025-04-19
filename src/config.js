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
    
    // For Dayton Chamber of Commerce - correct URL for member directory
    dayton: 'https://daytonareachamberofcommerce.growthzoneapp.com',
  },

  // CORS proxy configuration - we'll use a more reliable one
  corsProxy: 'https://api.allorigins.win/raw?url=',
  
  // List of backup proxies if the main one fails
  alternateProxies: [
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest='
  ],
  
  // New JSONP service that avoids CORS issues
  jsonpService: 'https://api.allorigins.win/get?url=',
  jsonpCallback: '&callback=handleJSONP'
};

export default config;

<span itemprop="sameAs">Visit Website</span>
<a href="http://athertonplumbing.com/" target="&quot;_blank&quot;" class="card-link" _clt="">
<i class="gz-fas gz-fa-globe"></i>
<span itemprop="sameAs">Visit Website</span>
</a>