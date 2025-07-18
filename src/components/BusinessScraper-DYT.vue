<template>
  <div class="flex flex-col bg-gray-800">
    <!-- Favicon Icon - centered above main content -->
    <div class="flex justify-center pt-8 pb-4">
      <img src="../assets/favicon/favicon.svg" alt="COC Scraper" style="width: 216px;" />
    </div>
    
    <!-- Header -->
    <div
      v-if="businesses.length"
      class="w-full bg-gray-700 text-white flex items-center justify-between px-4 py-2 sticky top-0 z-10 shadow-md"
    >
      <button
        @click="resetSearch"
        class="text-blue-400 hover:underline text-sm"
      >
        ← Back
      </button>
      <h2 class="text-sm font-bold text-center">
        Results for "{{ searchTerm }}" ({{ businesses.length }} businesses)
      </h2>
      <div></div> <!-- Empty div to balance the layout -->
    </div>

    <!-- Search Module -->
    <div
      v-if="!businesses.length"
      class="w-72 p-4 bg-gray-700 rounded shadow-md m-auto" 
    >
      <h1 class="text-xl font-bold text-blue-400 mb-4 text-center">COC Scraper</h1>
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Enter search term"
        class="border border-gray-700 p-2 w-full mb-4 bg-gray-600 text-white rounded"
        @keyup.enter="fetchBusinesses"
      />
      <button
        @click="() => { console.log('Button clicked!'); fetchBusinesses(); }"
        class="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600"
      >
        Search
      </button>
      <div v-if="loading" class="mt-4 text-center text-white">Loading...</div>
      <div v-if="error" class="mt-4 text-center text-red-500">{{ error }}</div>
    </div>

    <!-- Search Results -->
    <div
      v-if="businesses.length"
      class="w-full max-w-6xl p-4 grid gap-4 mx-auto"
      :class="{
        'grid-cols-1': windowWidth < 768,
        'grid-cols-3': windowWidth >= 768,
      }"
    >
      <div
        v-for="business in businesses"
        :key="business.name"
        class="p-4 border border-gray-700 rounded bg-gray-600 text-white"
      >
        <!-- Business Name - larger and bold, white color -->
        <p class="text-lg font-bold text-white mb-2">{{ business.name }}</p>
        
        <!-- Address with map icon -->
        <div class="mb-2 flex">
          <i class="fas fa-map-marker-alt text-blue-400 w-6 mt-1"></i>
          <div class="flex flex-col">
            <a :href="business.mapUrl" target="_blank" class="text-pink-300 hover:underline">
              <div>{{ business.address.split('\n')[0] }}</div>
              <div>{{ business.address.split('\n')[1] }}</div>
            </a>
          </div>
        </div>
        
        <!-- Phone with phone icon -->
        <div class="mb-2 flex">
          <i class="fas fa-phone text-blue-400 w-6 mt-1"></i>
          <div>
            <template v-if="business.phone === 'Phone not available' || business.phoneUrl === ''">
              {{ business.phone }}
            </template>
            <a v-else :href="business.phoneUrl" class="text-pink-300 hover:underline">
              {{ business.phone }}
            </a>
          </div>
        </div>
        
        <!-- Website with globe icon -->
        <div class="mb-2 flex">
          <i class="fas fa-globe text-blue-400 w-6 mt-1"></i>
          <div>
            <template v-if="business.website === 'n/a'">
              {{ business.website }}
            </template>
            <a v-else :href="business.website" target="_blank" class="text-pink-300 hover:underline break-all">
              {{ business.website }}
            </a>
          </div>
        </div>
        
        <!-- CoC Page as a simple hyperlink -->
        <div class="flex">
          <i class="fas fa-building text-blue-400 w-6 mt-1"></i>
          <div>
            <a :href="business.cocPageUrl" target="_blank" class="text-pink-300 hover:underline">
              CoC Page
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import * as cheerio from "cheerio";
import config from "../config.js"; // Import the config

export default {
  data() {
    return {
      searchTerm: "",
      businesses: [],
      loading: false,
      error: null,
      windowWidth: window.innerWidth, // Track window width for responsiveness
      currentProxyIndex: 0, // Track which proxy we're using
    };
  },
  methods: {
    async fetchBusinesses() {
      console.log("Dayton fetchBusinesses method called!");
      if (!this.searchTerm.trim()) {
        this.error = "Please enter a search term.";
        return;
      }

      this.loading = true;
      this.error = null;
      this.businesses = [];

      try {
        // Generate the target URL for Dayton Chamber of Commerce with the correct Find endpoint
        const baseUrl = config.apiBaseUrls.dayton.replace(/\/$/, '');
        const targetUrl = `${baseUrl}/activememberdirectory/Find?term=${encodeURIComponent(this.searchTerm)}`;
        
        // Try JSONP first as it's often more reliable for CORS issues
        let response;
        let success = false;
        let proxyAttempts = 0;
        const maxAttempts = config.alternateProxies.length + 2; // +2 for main proxy and JSONP
        
        while (!success && proxyAttempts < maxAttempts) {
          try {
            let proxyUrl;
            
            if (proxyAttempts === 0) {
              // First try the JSONP approach
              proxyUrl = `${config.jsonpService}${encodeURIComponent(targetUrl)}`;
              console.log("Trying JSONP approach:", proxyUrl);
            } else if (proxyAttempts === 1) {
              // Then try the main CORS proxy
              proxyUrl = `${config.corsProxy}${encodeURIComponent(targetUrl)}`;
              console.log("Trying main CORS proxy:", proxyUrl);
            } else {
              // Finally try alternate proxies
              const alternateIndex = proxyAttempts - 2;
              proxyUrl = `${config.alternateProxies[alternateIndex]}${encodeURIComponent(targetUrl)}`;
              console.log(`Trying alternate proxy ${alternateIndex + 1}:`, proxyUrl);
            }
            
            response = await axios.get(proxyUrl, {
              timeout: 20000, // Longer timeout for proxy services
            });
            
            // If we get here, the request succeeded
            console.log("Response received:", response.status);
            success = true;
            
            // If this was a JSONP response with contents field, extract it
            if (proxyAttempts === 0 && response.data && response.data.contents) {
              response.data = response.data.contents;
            }
            
          } catch (err) {
            console.error(`Proxy attempt ${proxyAttempts + 1} failed:`, err.message);
            proxyAttempts++;
            
            // If we've tried all proxies, throw the error to be caught by the outer catch
            if (proxyAttempts >= maxAttempts) {
              throw new Error("All proxy attempts failed");
            }
          }
        }
        
        // Load HTML content with cheerio
        const $ = cheerio.load(response.data);
        console.log("HTML loaded with cheerio");
        
        // Create a Map to track businesses by name to prevent duplicates
        const businessMap = new Map();
        
        // Select the appropriate elements for Dayton Chamber's directory listings
        // Updated selectors based on GrowthZone structure
        $('.card, .card-body, .member-card, .gz-card, .gz-directory-card').each((_, card) => {
          try {
            // Extract business name - using the gz-card-title class
            const nameElement = $(card).find('.gz-card-title, .card-title');
            const name = nameElement.text().trim();
            
            // Skip if no name found or it's already in our map
            if (!name || businessMap.has(name)) {
              return;
            }
            
            console.log("Found business:", name);
            
            // Extract business detail page URL
            let cocPageUrl = '#';
            const detailLink = nameElement.find('a').first();
            if (detailLink.length && detailLink.attr('href')) {
              const href = detailLink.attr('href');
              
              // Fix for URL construction to avoid duplicate domains
              if (href.startsWith('http')) {
                // Already absolute URL
                cocPageUrl = href;
              } else if (href.startsWith('//')) {
                // Protocol-relative URL
                cocPageUrl = 'https:' + href;
              } else if (href.startsWith('/')) {
                // Root-relative URL
                cocPageUrl = `${baseUrl}${href}`;
              } else {
                // Regular relative URL
                cocPageUrl = `${baseUrl}/${href}`;
              }
              
              console.log("CoC page URL:", cocPageUrl);
            }
            
            // Extract address
            let address = 'Address not available';
            let mapUrl = '';
            const addressElement = $(card).find('.gz-card-address, .gz-card-location, .card-address');
            
            if (addressElement.length) {
              // Get address text
              const addressLines = [];
              addressElement.find('div').each((_, div) => {
                const line = $(div).text().trim();
                if (line) addressLines.push(line);
              });
              
              if (addressLines.length > 0) {
                address = addressLines.join('\n');
                
                // Create an optimized Google Maps search URL
                // Format: Name + Full Address to better find the business page
                const businessNameForSearch = name.replace(/[&]/g, 'and').trim();
                const formattedAddress = address.replace(/\n/g, ', ');
                
                // Use Google's search API with properly formatted query
                // The "%22" adds quotes around the business name in the search to make it more precise
                mapUrl = `https://www.google.com/maps/search/?api=1&query=%22${encodeURIComponent(businessNameForSearch)}%22+${encodeURIComponent(formattedAddress)}`;
                
                console.log(`Created optimized map URL for ${name}`);
              } else {
                // Fallback to getting the entire text
                address = addressElement.text().trim().replace(/\s+/g, ' ');
                if (address) {
                  const businessNameForSearch = name.replace(/[&]/g, 'and').trim();
                  mapUrl = `https://www.google.com/maps/search/?api=1&query=%22${encodeURIComponent(businessNameForSearch)}%22+${encodeURIComponent(address)}`;
                }
              }
            } else {
              // If no address element found but we have the name, create a basic search URL
              mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
            }
            
            // Extract phone
            let phone = 'Phone not available';
            let phoneUrl = '';
            // Look specifically for telephone links first
            const phoneLinkElement = $(card).find('.card-link[href^="tel:"], a[href^="tel:"]');
            if (phoneLinkElement.length) {
              phoneUrl = phoneLinkElement.attr('href');
              // Get the text from the link, but if it's empty, use the tel: value without the prefix
              phone = phoneLinkElement.text().trim() || phoneUrl.replace('tel:', '');
            } else {
              // If no tel: link found, try to find text-based phone number
              const phoneElement = $(card).find('.gz-card-phone, .card-phone');
              if (phoneElement.length) {
                phone = phoneElement.text().trim();
                // Create a tel: URL by removing non-digit characters
                phoneUrl = `tel:${phone.replace(/\D/g, '')}`;
              }
            }
            
            // Ensure phone number is properly formatted in case we got it from href
            if (phone.startsWith('tel:')) {
              phone = phone.replace('tel:', '');
            }
            
            // Extract website - Updated to target the gz-card-website element specifically
            let website = 'n/a';
            const websiteElement = $(card).find('.gz-card-website a, li.gz-card-website a');
            if (websiteElement.length) {
              website = websiteElement.attr('href') || 'n/a';
              console.log("Found website:", website);
            } else {
              // Fallback to any card-link that's not a tel: or maps link
              const otherLinks = $(card).find('a.card-link:not([href^="tel:"]):not([href^="http://maps.google"]):not([href^="https://maps.google"]):not([href^="https://www.google.com/maps"])');
              if (otherLinks.length) {
                // Filter out any links that might be phone or map-related
                for (let i = 0; i < otherLinks.length; i++) {
                  const link = otherLinks[i];
                  const href = $(link).attr('href');
                  const text = $(link).text().trim().toLowerCase();
                  
                  // Skip if it looks like a map or phone link
                  if (text.includes('map') || text.includes('direction') || 
                      text.includes('phone') || text.includes('call') || 
                      (href && (href.includes('maps.') || href.includes('tel:')))) {
                    continue;
                  }
                  
                  // This is likely a website link
                  website = href;
                  console.log("Found website (alternative method):", website);
                  break;
                }
              }
            }
            
            // Add to map to prevent duplicates
            businessMap.set(name, {
              name,
              address,
              mapUrl,
              phone,
              phoneUrl,
              website,
              cocPageUrl
            });
            
          } catch (err) {
            console.error('Error parsing business card:', err);
          }
        });
        
        console.log(`Found ${businessMap.size} unique businesses`);
        
        if (businessMap.size > 0) {
          this.businesses = Array.from(businessMap.values());
        } else {
          // If no businesses found, try alternative selectors
          console.log("No businesses found with primary selectors, trying alternatives...");
          
          // Try a more general approach to find business listings
          $('.card, .list-item, .member-item, .directory-item').each((_, card) => {
            try {
              // Look for any heading element that might contain the business name
              const nameElement = $(card).find('h2, h3, h4, h5, .title, .name').first();
              const name = nameElement.text().trim();
              
              if (!name || businessMap.has(name)) {
                return;
              }
              
              console.log("Found business with alternative selector:", name);
              
              // Extract minimal information
              const cocPageUrl = nameElement.find('a').attr('href') || '#';
              
              // Look for phone links
              let phone = "See CoC Page for details";
              let phoneUrl = "";
              const phoneLink = $(card).find('a[href^="tel:"]');
              if (phoneLink.length) {
                phoneUrl = phoneLink.attr('href');
                phone = phoneLink.text().trim() || phoneUrl.replace('tel:', '');
              }
              
              // Add to map
              businessMap.set(name, {
                name,
                address: "See CoC Page for details",
                mapUrl: "",
                phone: phone,
                phoneUrl: phoneUrl,
                website: "n/a",
                cocPageUrl: cocPageUrl.startsWith('/') ? 
                  `${baseUrl}${cocPageUrl}` : 
                  cocPageUrl.startsWith('http') ? cocPageUrl : `${baseUrl}/${cocPageUrl}`
              });
              
            } catch (err) {
              console.error('Error parsing with alternative selector:', err);
            }
          });
          
          console.log(`Found ${businessMap.size} businesses after trying alternative selectors`);
          
          if (businessMap.size > 0) {
            this.businesses = Array.from(businessMap.values());
          } else {
            this.error = "No businesses found matching your search term.";
          }
        }
      } catch (err) {
        this.error = "Failed to fetch data. Please try again.";
        console.error("Error fetching data:", err);
        if (err.response) {
          console.error("Response status:", err.response.status);
          console.error("Response data:", err.response.data);
        }
      } finally {
        this.loading = false;
      }
    },
    resetSearch() {
      this.businesses = [];
      this.searchTerm = "";
      this.error = null;
    },
    updateWindowWidth() {
      this.windowWidth = window.innerWidth;
    },
    formatStreetAddress(address) {
      // Implement logic to extract and format the street address
      return address.split("\n")[0] || "Street address not available";
    },
    formatCityStateZip(address) {
      // Implement logic to extract and format the city, state, and zip
      const parts = address.split("\n");
      return parts[1] || "City, State, ZIP not available";
    },
  },
  mounted() {
    console.log("BusinessScraper-DYT component mounted!");
    window.addEventListener("resize", this.updateWindowWidth);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.updateWindowWidth);
  },
};
</script>