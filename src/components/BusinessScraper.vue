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
        @click="fetchBusinesses"
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
      console.log("Wilmington fetchBusinesses method called!");
      if (!this.searchTerm.trim()) {
        this.error = "Please enter a search term.";
        return;
      }

      this.loading = true;
      this.error = null;
      this.businesses = [];

      // Try each proxy in sequence until one works
      const proxies = [config.corsProxy, ...config.alternateProxies];
      let success = false;
      let lastError = null;

      for (let i = 0; i < proxies.length && !success; i++) {
        const currentProxy = proxies[i];
        console.log(`Attempting with proxy ${i+1}/${proxies.length}: ${currentProxy}`);
        
        const baseUrl = config.apiBaseUrls.wilmington.replace(/\/$/, '');
        const searchUrl = `${currentProxy}${encodeURIComponent(baseUrl + '/list/search?q=' + encodeURIComponent(this.searchTerm) + '&c=&sa=False')}`;
        
        console.log("Generated URL:", searchUrl);

        try {
          console.log("Sending request to:", searchUrl);
          const searchResponse = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            // Shorter timeout to quickly try other proxies if one fails
            timeout: 10000
          });
          
          console.log("Response received:", searchResponse.status);
          
          const $ = cheerio.load(searchResponse.data);
          console.log("HTML loaded with cheerio");

          // Collect business info
          const businessesBasicInfo = [];
          $("div.gz-list-card-wrapper").each((_, cardWrapper) => {
            const cardElement = $(cardWrapper);
            
            // Extract name
            const nameElement = cardElement.find("h5.card-title a");
            const name = nameElement.text().trim();
            const businessPageUrl = nameElement.attr("href");
            
            // Process the business page URL for the CoC page - don't add proxy
            let cocPageUrl;
            
            // Function to process URLs to get direct chamber URL (without CORS proxy)
            const processUrl = (url) => {
              const baseUrl = config.apiBaseUrls.wilmington;
              
              // Handle absolute URLs from the chamber site
              if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
              } 
              // Handle relative URLs
              else if (url.startsWith('/')) {
                return `${baseUrl}${url}`;
              } else {
                return `${baseUrl}/${url}`;
              }
            };
            
            cocPageUrl = processUrl(businessPageUrl);
            
            // Enhanced address extraction to properly capture city/state/zip
            const addressElement = cardElement.find("li.gz-card-address");
            let streetAddress = "";
            let cityStateZip = "";
            let mapUrl = "";
            
            if (addressElement.length) {
              // Get the map URL for the address
              mapUrl = addressElement.find("a").attr("href") || "";
              
              // Extract street address
              const streetElements = addressElement.find("span.gz-street-address");
              if (streetElements.length > 0) {
                streetElements.each((i, el) => {
                  streetAddress += (i > 0 ? ", " : "") + $(el).text().trim();
                });
              }
              
              // Extract city, state, zip
              const cityStateZipElement = addressElement.find("div[itemprop='citystatezip']");
              if (cityStateZipElement.length > 0) {
                const cityElement = cityStateZipElement.find("span.gz-address-city");
                const stateElement = cityStateZipElement.find("span").eq(1);
                const zipElement = cityStateZipElement.find("span").eq(2);
                
                const city = cityElement.length > 0 ? cityElement.text().trim() : "City not available";
                const state = stateElement.length > 0 ? stateElement.text().trim() : "State not available";
                const zip = zipElement.length > 0 ? zipElement.text().trim() : "ZIP not available";
                
                cityStateZip = `${city}, ${state} ${zip}`;
              }
            }
            
            // Combine street address and city/state/zip with a newline between them
            const address = streetAddress + (streetAddress && cityStateZip ? "\n" : "") + cityStateZip;
            
            // Get phone number
            const phone = cardElement.find("li.gz-card-phone a").text().trim();

            // Store all extracted information
            businessesBasicInfo.push({
              name,
              address: address || "Address not available",
              mapUrl,
              phone: phone || "Phone number not available",
              cocPageUrl
            });
          });

          console.log(`Found ${businessesBasicInfo.length} businesses.`);
          
          if (businessesBasicInfo.length > 0) {
            // Set businesses with the data we've extracted
            this.businesses = businessesBasicInfo;
            success = true;
            break; // Exit the proxy loop since we found a working proxy
          } else {
            console.log("No businesses found, trying next proxy...");
          }

        } catch (err) {
          lastError = err;
          console.error(`Error with proxy ${currentProxy}:`, err);
          // Continue to next proxy
        }
      }

      // If all proxies failed, show an error
      if (!success) {
        this.error = "Failed to fetch data after trying all available proxies. Please try again later.";
        console.error("All proxies failed. Last error:", lastError);
      }
      
      this.loading = false;
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
    window.addEventListener("resize", this.updateWindowWidth);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.updateWindowWidth);
  },
};
</script>