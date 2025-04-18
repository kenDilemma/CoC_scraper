<template>
  <div class="flex flex-col bg-gray-800">
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
          <div>{{ business.phone }}</div>
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

      // Use the config for the base URL
      const baseUrl = config.apiBaseUrls.dayton;
      const searchUrl = `${baseUrl}/activememberdirectory/Find?term=${encodeURIComponent(this.searchTerm)}`;
      console.log("Generated URL:", searchUrl);

      try {
        console.log("Sending request to:", searchUrl);
        const response = await axios.get(searchUrl);
        console.log("Response received:", response.status);
        
        if (!response.data) {
          throw new Error("No data returned from search");
        }
        
        const $ = cheerio.load(response.data);
        console.log("HTML loaded with cheerio");
        
        // Create a Map to track businesses by name to prevent duplicates
        const businessMap = new Map();
        
        // Look for business cards with different possible selectors
        $('.gz-directory-card, .gz-card-wrapper, .gz-list-card-wrapper').each((_, card) => {
          try {
            // Find business name - try different selectors that might contain the name
            let name = "";
            const nameEl = $(card).find('.gz-card-title, h3.gz-card-title, h4, h5').first();
            if (nameEl.length) {
              name = nameEl.text().trim();
              // Sometimes the name is inside an <a> tag
              if (!name) {
                name = nameEl.find('a').text().trim();
              }
            }
            
            // Skip if no name found or it's already in our map
            if (!name || businessMap.has(name)) {
              return;
            }
            console.log("Found business:", name);
            
            // Extract address
            let address = 'Address not available';
            let mapUrl = '';
            const addressEl = $(card).find('.gz-card-address a');
            if (addressEl.length) {
              mapUrl = addressEl.attr('href') || '';
              const addressText = addressEl.text().replace(/\s+/g, ' ').trim();
              if (addressText) {
                // Split at comma if possible for better formatting
                const parts = addressText.split(',');
                if (parts.length > 1) {
                  const street = parts[0].trim();
                  const rest = parts.slice(1).join(',').trim();
                  address = street + '\n' + rest;
                } else {
                  address = addressText;
                }
              }
            }
            
            // Extract phone
            let phone = 'Phone not available';
            const phoneEl = $(card).find('.gz-card-phone');
            if (phoneEl.length) {
              phone = phoneEl.text().trim();
            }
            
            // Extract website
            let website = 'n/a';
            const websiteEl = $(card).find('.gz-card-website a');
            if (websiteEl.length) {
              website = websiteEl.attr('href') || 'n/a';
            }
            
            // Get CoC page URL - more specifically targeting the gz-card-head-img link
            let cocPageUrl = '#';
            
            // Process the URL properly based on environment
            const processUrl = (href) => {
              // In production, use full URLs with CORS proxy
              if (import.meta.env.PROD) {
                if (href.startsWith('//')) {
                  return `${config.apiBaseUrls.dayton}${href.substring(href.indexOf('/', 2))}`;
                } else if (href.startsWith('/')) {
                  return `${config.apiBaseUrls.dayton}${href}`;
                } else {
                  return href; // Already a full URL
                }
              } 
              // In development, use the proxy configured in vite.config.js
              else {
                if (href.startsWith('//')) {
                  const path = href.substring(href.indexOf('/', 2));
                  return `/api/dayton${path}`;
                } else if (href.startsWith('/')) {
                  return `/api/dayton${href}`;
                } else if (href.includes('daytonareachamberofcommerce.growthzoneapp.com')) {
                  try {
                    const url = new URL(href);
                    return `/api/dayton${url.pathname}${url.search}`;
                  } catch (e) {
                    console.error('Error parsing URL:', e);
                    return '#';
                  }
                } else {
                  return `/api/dayton/${href}`;
                }
              }
            };

            // Specifically try to find the company logo link first - exactly as in the HTML example
            const headerImgLink = $(card).find('a.gz-card-head-img');
            if (headerImgLink.length && headerImgLink.attr('href')) {
              const href = headerImgLink.attr('href');
              console.log(`Found card-head-img link for ${name}:`, href);
              cocPageUrl = processUrl(href);
            } else {
              // Fall back to other methods if the specific link isn't found
              const possibleLinkSelectors = [
                // Try the More Details link
                () => $(card).find('a:contains("More Details")'),
                
                // Try any link wrapping the business name
                () => $(card).find('.gz-card-title a'),
                
                // Try links in the card body that might lead to details
                () => $(card).find('.gz-card-more-details a')
              ];
              
              for (const selector of possibleLinkSelectors) {
                const linkEl = selector();
                if (linkEl.length && linkEl.attr('href')) {
                  const href = linkEl.attr('href');
                  console.log(`Found fallback link for ${name}:`, href);
                  cocPageUrl = processUrl(href);
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
              website,
              cocPageUrl
            });
          } catch (err) {
            console.error('Error parsing business card:', err);
          }
        });
        
        console.log(`Found ${businessMap.size} unique businesses`);
        this.businesses = Array.from(businessMap.values());
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