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

      // Generate the target URL
      const baseUrl = config.apiBaseUrls.dayton.replace(/\/$/, '');
      const targetUrl = `${baseUrl}/activememberdirectory/Find?term=${encodeURIComponent(this.searchTerm)}`;
      
      // Use the allorigins.win service with JSON output format - same approach that worked for Wilmington
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      console.log("Generated URL:", proxyUrl);

      try {
        console.log("Sending request to:", proxyUrl);
        const response = await axios.get(proxyUrl);
        console.log("Response received:", response.status);
        
        // Check if we have a valid response
        if (response.data && response.data.contents) {
          // Load the HTML content from the JSON response
          const $ = cheerio.load(response.data.contents);
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
              
              // Get CoC page URL
              let cocPageUrl = '#';
              
              // Process the URL properly for direct access (without CORS proxy)
              const processUrl = (href) => {
                if (href.startsWith('//')) {
                  return `https:${href}`;
                } else if (href.startsWith('/')) {
                  return `${baseUrl}${href}`;
                } else if (!href.startsWith('http')) {
                  return `${baseUrl}/${href}`;
                }
                return href; // Already a full URL
              };

              // Specifically try to find the company logo link first
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
          
          if (businessMap.size > 0) {
            this.businesses = Array.from(businessMap.values());
          } else {
            this.error = "No businesses found matching your search term.";
            console.log("No businesses found in the search results.");
          }
        } else {
          this.error = "Error processing the response from the server.";
          console.error("Invalid response format:", response.data);
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