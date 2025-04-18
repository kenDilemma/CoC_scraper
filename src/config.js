// Configuration file for the CoC scraper
// This file contains environment-specific configurations

// Function to determine if we're in production (GitHub Pages) or development
const isProd = () => {
  return import.meta.env.PROD;
};

const config = {
  // Base API URLs for the chambers of commerce
  apiBaseUrls: {
    // For Wilmington Chamber of Commerce
    wilmington: isProd()
      ? 'https://corsproxy.io/?https://www.wilmingtonchamber.org'
      : '/api/wilmington',
    
    // For Dayton Chamber of Commerce
    dayton: isProd()
      ? 'https://corsproxy.io/?https://www.daytonareachamberofcommerce.growthzoneapp.com'
      : '/api/dayton',
  },

  // CORS proxy configuration
  // Adding alternate proxies to try if one fails
  corsProxy: 'https://corsproxy.io/?',
  alternateProxies: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
  ]
};

export default config;