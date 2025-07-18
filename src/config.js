// Configuration file for the CoC scraper
// This file contains environment-specific configurations

// Function to determine if we're in production (GitHub Pages) or development
const isProd = () => {
  return import.meta.env.PROD;
};

const config = {
  // City-specific configurations
  cities: [
    {
      id: 'wilmington',
      name: 'Wilmington',
      baseUrl: 'https://www.wilmingtonchamber.org',
      searchPath: '/list/search',
      searchParams: (term) => `?q=${encodeURIComponent(term)}&c=&sa=False`,
      type: 'growthzone-list', // Different scraping patterns
      selectors: {
        cardWrapper: 'div.gz-list-card-wrapper',
        businessName: 'h5.card-title a',
        businessUrl: 'h5.card-title a',
        addressElement: 'li.gz-card-address',
        streetAddress: 'span.gz-street-address',
        cityStateZip: 'div[itemprop="citystatezip"]',
        cityElement: 'span.gz-address-city',
        phoneElement: 'li.gz-card-phone a'
      }
    },
    {
      id: 'dayton',
      name: 'Dayton',
      baseUrl: 'https://daytonareachamberofcommerce.growthzoneapp.com',
      searchPath: '/activememberdirectory/Find',
      searchParams: (term) => `?term=${encodeURIComponent(term)}`,
      type: 'growthzone-cards', // Different scraping patterns
      selectors: {
        cardWrapper: '.card, .card-body, .member-card, .gz-card, .gz-directory-card',
        businessName: '.gz-card-title, .card-title',
        businessUrl: '.gz-card-title a, .card-title a',
        addressElement: '.gz-card-address, .gz-card-location, .card-address',
        phoneElement: '.card-link[href^="tel:"], a[href^="tel:"]',
        phoneFallback: '.gz-card-phone, .card-phone',
        websiteElement: '.gz-card-website a, li.gz-card-website a',
        websiteFallback: 'a.card-link:not([href^="tel:"]):not([href^="http://maps.google"]):not([href^="https://maps.google"]):not([href^="https://www.google.com/maps"])'
      }
    },
    {
      id: 'huntington-beach',
      name: 'Huntington Beach',
      baseUrl: 'https://chamber.hbchamber.com',
      searchPath: '/list/search',
      searchParams: (term) => `?q=${encodeURIComponent(term)}&c=&sa=False`,
      type: 'growthzone-list', // Same as Wilmington
      selectors: {
        cardWrapper: 'div.gz-list-card-wrapper',
        businessName: 'h5.card-title a',
        businessUrl: 'h5.card-title a',
        addressElement: 'li.gz-card-address',
        streetAddress: 'span.gz-street-address',
        cityStateZip: 'div[itemprop="citystatezip"]',
        cityElement: 'span.gz-address-city',
        phoneElement: 'li.gz-card-phone a',
        websiteElement: 'a:contains("Visit Website")'
      }
    }
  ],

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
  jsonpCallback: '&callback=handleJSONP',

  // Helper functions
  getCityConfig: (cityId) => {
    return config.cities.find(city => city.id === cityId);
  },

  // Backwards compatibility - will be removed later
  apiBaseUrls: {
    wilmington: 'https://www.wilmingtonchamber.org',
    dayton: 'https://daytonareachamberofcommerce.growthzoneapp.com',
    huntingtonBeach: 'https://chamber.hbchamber.com',
  }
};

export default config;
