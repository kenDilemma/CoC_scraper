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
      console.log("Wilmington fetchBusinesses method called!");
      if (!this.searchTerm.trim()) {
        this.error = "Please enter a search term.";
        return;
      }

      this.loading = true;
      this.error = null;
      this.businesses = [];

      // Use the config for the base URL
      const baseUrl = config.apiBaseUrls.wilmington;
      const searchUrl = `${baseUrl}/list/search?q=${encodeURIComponent(this.searchTerm)}&c=&sa=False`;

      console.log("Generated URL:", searchUrl);

      try {
        console.log("Sending request to:", searchUrl);
        const searchResponse = await axios.get(searchUrl);
        console.log("Response received:", searchResponse.status);
        
        const $ = cheerio.load(searchResponse.data);
        console.log("HTML loaded with cheerio");

        // First pass: collect basic business info and business page URLs
        const businessesBasicInfo = [];
        $("h5.card-title").each((_, element) => {
          const name = $(element).find("a").text().trim();
          const businessPageUrl = $(element).find("a").attr("href");
          
          // Process the business page URL to ensure it works across environments
          let cocPageUrl;
          
          // Function to process URLs based on environment
          const processUrl = (url) => {
            // In production, use full URLs with CORS proxy
            if (import.meta.env.PROD) {
              if (url.startsWith('http://') || url.startsWith('https://')) {
                return url; // Already a full URL
              } else if (url.startsWith('/')) {
                return `${config.apiBaseUrls.wilmington}${url}`;
              } else {
                return `${config.apiBaseUrls.wilmington}/${url}`;
              }
            } 
            // In development, use the proxy configured in vite.config.js
            else {
              if (url.startsWith('http://') || url.startsWith('https://')) {
                // Extract the path from the full URL
                try {
                  const urlObj = new URL(url);
                  return `/api/wilmington${urlObj.pathname}${urlObj.search}`;
                } catch (e) {
                  console.error('Error parsing URL:', e);
                  return '#';
                }
              } else if (url.startsWith('/')) {
                return `/api/wilmington${url}`;
              } else {
                return `/api/wilmington/${url}`;
              }
            }
          };
          
          cocPageUrl = processUrl(businessPageUrl);

          const parentDiv = $(element).closest("div.gz-list-card-wrapper");
          
          // Enhanced address extraction to properly capture city/state/zip
          const addressElement = parentDiv.find("li.gz-card-address");
          let streetAddress = "";
          let cityStateZip = "";
          let mapUrl = ""; // Store the Google Maps URL for the address
          
          if (addressElement) {
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
          const phone = parentDiv.find("li.gz-card-phone a").text().trim();

          // NEW: Try to extract website directly from search results
          let website = "n/a";
          
          // Look for website in the list card
          const websiteElement = parentDiv.find("li.gz-card-website a");
          if (websiteElement.length > 0 && websiteElement.attr("href")) {
            website = websiteElement.attr("href");
          }
          
          // Alternative: Look for any links with text containing website indicators
          if (website === "n/a") {
            parentDiv.find("a").each((_, el) => {
              const linkText = $(el).text().trim().toLowerCase();
              const href = $(el).attr("href");
              
              if (href && 
                 (linkText.includes("website") || 
                  linkText.includes("visit site") || 
                  linkText.includes("view site") || 
                  linkText.includes("web") ||
                  linkText === "site")) {
                website = href;
                return false; // Break each loop
              }
            });
          }
          
          // Final approach: Look for any external URL links that aren't social media or maps
          if (website === "n/a") {
            parentDiv.find("a").each((_, el) => {
              const href = $(el).attr("href") || "";
              if (href.match(/^https?:\/\//) && 
                  !href.includes("google.com/maps") &&
                  !href.includes("facebook.com") &&
                  !href.includes("twitter.com") &&
                  !href.includes("instagram.com") &&
                  !href.includes("linkedin.com") &&
                  !href.includes("youtube.com") &&
                  !href.includes("wilmingtonchamber.org")) {
                website = href;
                return false; // Break each loop
              }
            });
          }

          businessesBasicInfo.push({
            name,
            address: address || "Address not available",
            mapUrl, // Store the Google Maps URL
            phone: phone || "Phone number not available",
            cocPageUrl, // Store the chamber of commerce page URL
            website: website // Store the website URL found in search results
          });
        });

        console.log(`Found ${businessesBasicInfo.length} businesses.`);
        
        // Set businesses with already extracted website data
        this.businesses = businessesBasicInfo.map(business => ({
          ...business
        }));
        
        // If there are still n/a websites and we want to try fetching individual pages (likely to fail with 403)
        // Uncomment the below line if you want to try anyway
        // this.fetchIndividualBusinessPages(businessesBasicInfo);

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
    window.addEventListener("resize", this.updateWindowWidth);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.updateWindowWidth);
  },
};
</script>