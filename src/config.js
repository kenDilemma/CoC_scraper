// Configuration file for the CoC scraper
// This file contains environment-specific configurations
import * as cheerio from 'cheerio';

// Function to determine if we're in production (GitHub Pages) or development
const isProd = () => {
  return import.meta.env.PROD;
};

// Custom parser for NYC (non-GrowthZone)
const parseNYCBusinesses = async (html, searchTerm) => {
  const $ = cheerio.load(html);
  const businesses = [];
  const businessNames = new Set();

  console.log('[NYC] Parsing HTML for businesses...');
  console.log('[NYC] HTML length:', html.length);
  console.log('[NYC] HTML sample (first 500 chars):', html.substring(0, 500));
  
  // Debug: Check what we actually got
  const totalDivs = $('div').length;
  const divsWithH3 = $('div').filter((i, el) => $(el).find('h3').length > 0).length;
  const h3Count = $('h3').length;
  
  console.log(`[NYC] Total divs: ${totalDivs}, Divs with h3: ${divsWithH3}, Total h3s: ${h3Count}`);
  
  // Look for business container selectors
  $('div[class*="business"], div[class*="member"], div[class*="directory"], div[class*="listing"], div.bg-gray-600:nth-child(2), div:has(h3)').each((index, element) => {
    const $element = $(element);
    const h3 = $element.find('h3').first();
    
    if (h3.length > 0) {
      const name = h3.text().trim();
      console.log(`[NYC] Found business candidate: "${name}"`);
      
      if (name && name.length > 0 && !businessNames.has(name)) {
        businessNames.add(name);
        
        const business = {
          name: name,
          address: null,
          phone: null,
          website: null,
          contactPerson: null,
          email: null,
          chamberUrl: null,
          mapUrl: null,
          phoneUrl: null
        };

        $element.find('p').each((i, p) => {
          const text = $(p).text().trim();
          
          if (!text) return;
          
          if (text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/)) {
            business.phone = text;
            business.phoneUrl = `tel:${text.replace(/\D/g, '')}`;
          }
          else if (text.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Place|Pl|Court|Ct)/i)) {
            business.address = text;
            business.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + text)}`;
          }
          else if (!business.contactPerson && text.match(/[A-Za-z\s]{3,}/) && !text.includes('http')) {
            business.contactPerson = text;
          }
        });

        $element.find('a[href^="http"]').each((i, link) => {
          const href = $(link).attr('href');
          if (href && !href.includes('chamber.nyc')) {
            business.website = href;
          }
        });

        const chamberLink = $element.find('a[href*="chamber.nyc"]').first();
        if (chamberLink.length > 0) {
          business.chamberUrl = chamberLink.attr('href');
        }

        businesses.push(business);
      }
    }
  });

  // Fallback: general div approach
  if (businesses.length === 0) {
    console.log('[NYC] No businesses found with specific selectors, trying general approach...');
    
    $('div').each((index, element) => {
      const $element = $(element);
      const h3 = $element.find('h3').first();
      
      if (h3.length > 0) {
        const name = h3.text().trim();
        if (name && name.length > 0 && !businessNames.has(name)) {
          businessNames.add(name);
          
          const business = {
            name: name,
            address: null,
            phone: null,
            website: null,
            contactPerson: null,
            email: null,
            chamberUrl: null,
            mapUrl: null,
            phoneUrl: null
          };

          // Same parsing logic as above
          $element.find('p').each((i, p) => {
            const text = $(p).text().trim();
            
            if (!text) return;
            
            if (text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/)) {
              business.phone = text;
              business.phoneUrl = `tel:${text.replace(/\D/g, '')}`;
            }
            else if (text.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Place|Pl|Court|Ct)/i)) {
              business.address = text;
              business.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + text)}`;
            }
            else if (!business.contactPerson && text.match(/[A-Za-z\s]{3,}/) && !text.includes('http')) {
              business.contactPerson = text;
            }
          });

          $element.find('a[href^="http"]').each((i, link) => {
            const href = $(link).attr('href');
            if (href && !href.includes('chamber.nyc')) {
              business.website = href;
            }
          });

          const chamberLink = $element.find('a[href*="chamber.nyc"]').first();
          if (chamberLink.length > 0) {
            business.chamberUrl = chamberLink.attr('href');
          }

          businesses.push(business);
        }
      }
    });
  }

  console.log(`[NYC] Found ${businesses.length} businesses`);
  return businesses;
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
    },
    {
      id: 'new-york',
      name: 'New York',
      baseUrl: 'https://chamber.nyc',
      searchPath: '/business-directory',
      searchParams: (term) => `?search=${encodeURIComponent(term)}`,
      type: 'custom', // Custom parsing
      customParser: parseNYCBusinesses, // Custom parser function
      selectors: {
        // These are used for documentation but actual parsing is in customParser
        cardWrapper: 'div:has(h3)',
        businessName: 'h3',
        businessUrl: 'h3',
        contactPerson: 'p',
        phoneElement: 'p',
        websiteElement: 'a[href^="http"]',
        addressElement: 'p'
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

  // Proxy URL helper
  getProxyUrl: (proxy, targetUrl) => {
    return `${proxy}${encodeURIComponent(targetUrl)}`;
  },

  // Backwards compatibility - will be removed later
  apiBaseUrls: {
    wilmington: 'https://www.wilmingtonchamber.org',
    dayton: 'https://daytonareachamberofcommerce.growthzoneapp.com',
    huntingtonBeach: 'https://chamber.hbchamber.com',
  }
};

export default config;

// Named exports for convenience
export const getCityConfig = config.getCityConfig;
export const getProxyUrl = config.getProxyUrl;
