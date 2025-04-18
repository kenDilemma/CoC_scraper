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

          businessesBasicInfo.push({
            name,
            address: address || "Address not available",
            mapUrl, // Store the Google Maps URL
            phone: phone || "Phone number not available",
            cocPageUrl, // Store the chamber of commerce page URL
          });
        });

        console.log(`Found ${businessesBasicInfo.length} businesses.`);
        
        // First populate basic data
        this.businesses = businessesBasicInfo.map(business => ({
          ...business,
          website: "n/a" // Placeholder until we fetch the actual website
        }));
        
        // Then fetch additional details from individual business pages
        console.log(`Fetching details for individual business pages...`);
        this.fetchIndividualBusinessPages(businessesBasicInfo);

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

    /**
     * Fetches individual business pages to extract additional details like website URLs.
     * Uses proper CORS handling for both development and production environments.
     */
    async fetchIndividualBusinessPages(businessesBasicInfo) {
      // Process business pages in smaller batches to avoid overwhelming the browser
      const batchSize = 5;
      const totalBusinesses = businessesBasicInfo.length;
      
      for (let i = 0; i < totalBusinesses; i += batchSize) {
        const batch = businessesBasicInfo.slice(i, i + batchSize);
        
        try {
          const promises = batch.map(async (business) => {
            try {
              // Use the correct URL format with CORS proxy in production
              let businessPageUrl = business.cocPageUrl;
              
              // In production, make sure we're using the CORS proxy
              if (import.meta.env.PROD) {
                // For Wilmington Chamber of Commerce URLs
                if (businessPageUrl.includes('wilmingtonchamber.org')) {
                  // Apply the CORS proxy
                  businessPageUrl = `https://corsproxy.io/?${encodeURIComponent(businessPageUrl)}`;
                }
                // For relative URLs, convert to absolute with CORS proxy
                else if (businessPageUrl.startsWith('/')) {
                  const fullUrl = `https://www.wilmingtonchamber.org${businessPageUrl}`;
                  businessPageUrl = `https://corsproxy.io/?${encodeURIComponent(fullUrl)}`;
                }
              }
              
              console.log(`Fetching individual page for ${business.name}: ${businessPageUrl}`);
              
              // Make request to the individual business page
              const businessPageResponse = await axios.get(businessPageUrl);
              const pageHtml = businessPageResponse.data;
              const businessPage$ = cheerio.load(pageHtml);
              
              // Look for the company website link on the individual business page
              let websiteUrl = "n/a";
              let found = false;
              
              // Priority 1: Look for links with "Visit Website" text
              businessPage$("a").each((_, el) => {
                const text = businessPage$(el).text().trim();
                if (text.toLowerCase().includes("visit website") && 
                    businessPage$(el).attr("href")) {
                  websiteUrl = businessPage$(el).attr("href");
                  console.log(`Found "Visit Website" link for ${business.name}: ${websiteUrl}`);
                  found = true;
                  return false; // Break each loop
                }
              });
              
              // Priority 2: Only if not found above, try card-link class
              if (!found) {
                const websiteElement = businessPage$("a.card-link");
                if (websiteElement.length > 0 && websiteElement.attr("href")) {
                  // Make sure it's not a Google Maps link
                  const href = websiteElement.attr("href");
                  if (!href.includes("google.com/maps")) {
                    websiteUrl = href;
                    console.log(`Found card-link website for ${business.name}: ${websiteUrl}`);
                    found = true;
                  }
                }
              }
              
              // Update the business in our array with the website URL
              if (found && websiteUrl !== "n/a") {
                const index = this.businesses.findIndex(b => b.name === business.name);
                if (index !== -1) {
                  this.businesses[index].website = websiteUrl;
                }
              }
              
              return {
                name: business.name,
                website: websiteUrl
              };
            } catch (err) {
              console.log(`Error fetching page for ${business.name}: ${err.message}`);
              return {
                name: business.name,
                website: "n/a"
              };
            }
          });
          
          await Promise.all(promises);
          console.log(`Processed batch ${Math.min(i + batchSize, totalBusinesses)}/${totalBusinesses}`);
          
          // Small delay between batches to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.log(`Error processing batch ${i}-${i+batchSize}:`, error);
        }
      }
      
      console.log("All individual business pages processed");
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