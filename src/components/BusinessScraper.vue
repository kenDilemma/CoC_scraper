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

      // Get the base URL from config and add CORS proxy
      const corsProxy = config.corsProxy;
      const baseUrl = config.apiBaseUrls.wilmington.replace(/\/$/, '');
      const searchUrl = `${corsProxy}${baseUrl}/list/search?q=${encodeURIComponent(this.searchTerm)}&c=&sa=False`;

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
            const corsProxy = config.corsProxy;
            const baseUrl = config.apiBaseUrls.wilmington;
            
            // Handle absolute URLs from the chamber site
            if (url.startsWith('http://') || url.startsWith('https://')) {
              return `${corsProxy}${url}`;
            } 
            // Handle relative URLs
            else if (url.startsWith('/')) {
              return `${corsProxy}${baseUrl}${url}`;
            } else {
              return `${corsProxy}${baseUrl}/${url}`;
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
        
        // Fetch websites for businesses that don't have one from the individual pages
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

    async fetchIndividualBusinessPages(businessesBasicInfo) {
      console.log("Starting to fetch individual business pages...");
      const batchSize = 3; // Process fewer businesses at once to avoid rate limiting
      let updatedWebsiteCount = 0;
      
      // Only process businesses that don't already have a website
      const businessesWithoutWebsites = businessesBasicInfo.filter(b => b.website === "n/a");
      console.log(`Found ${businessesWithoutWebsites.length} businesses without websites to process`);
      
      if (businessesWithoutWebsites.length === 0) {
        console.log("All businesses already have websites, no need to fetch individual pages");
        return;
      }
      
      // Use the CORS proxy from config
      const corsProxy = config.corsProxy;
      
      try {
        for (let i = 0; i < businessesWithoutWebsites.length; i += batchSize) {
          const batch = businessesWithoutWebsites.slice(i, i + batchSize);
          console.log(`Processing batch ${Math.ceil((i+1)/batchSize)} of ${Math.ceil(businessesWithoutWebsites.length/batchSize)}`);
          
          // Process businesses sequentially rather than in parallel to avoid rate limiting
          for (const business of batch) {
            try {
              console.log(`Fetching website for ${business.name} from ${business.cocPageUrl}`);
              
              // Add a short delay between requests to avoid triggering anti-scraping measures
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Check if the URL already has the CORS proxy and use it directly if so
              const requestUrl = business.cocPageUrl;
              
              const response = await axios.get(requestUrl, { 
                timeout: 10000,
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
              });
              
              // Parse the HTML
              const businessPage$ = cheerio.load(response.data);
              
              // Look for website links
              let websiteUrl = "n/a";
              let found = false;
              
              // Strategy 1: Look for links with "Visit Website" text
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
              
              // Strategy 2: Look for links with "Website" text or aria-label, or "View Our Site" text
              if (!found) {
                businessPage$("a").each((_, el) => {
                  const text = businessPage$(el).text().trim();
                  const ariaLabel = businessPage$(el).attr("aria-label") || "";
                  
                  if ((text.toLowerCase().includes("website") || 
                       text.toLowerCase().includes("view our site") ||
                       text.toLowerCase().includes("visit site") ||
                       ariaLabel.toLowerCase().includes("website")) && 
                      businessPage$(el).attr("href")) {
                    websiteUrl = businessPage$(el).attr("href");
                    console.log(`Found website link for ${business.name} with text: "${text}"`);
                    found = true;
                    return false; // Break each loop
                  }
                });
              }
              
              // Strategy 3: Look for any link containing http/https that isn't a social media or known non-website link
              if (!found) {
                businessPage$("a").each((_, el) => {
                  const href = businessPage$(el).attr("href") || "";
                  
                  // Check if it's a likely website URL (not social media, maps, chamber links, etc.)
                  if (href.match(/^https?:\/\//) && 
                      !href.includes("google.com/maps") &&
                      !href.includes("facebook.com") &&
                      !href.includes("twitter.com") &&
                      !href.includes("instagram.com") &&
                      !href.includes("linkedin.com") &&
                      !href.includes("youtube.com") &&
                      !href.includes("wilmingtonchamber.org")) {
                        
                    websiteUrl = href;
                    console.log(`Found likely website URL for ${business.name}: ${websiteUrl}`);
                    found = true;
                    return false; // Break each loop
                  }
                });
              }
              
              // If we found a website, update it in our array
              if (found && websiteUrl !== "n/a") {
                const index = this.businesses.findIndex(b => b.name === business.name);
                if (index !== -1) {
                  this.businesses[index].website = websiteUrl;
                  updatedWebsiteCount++;
                  console.log(`Updated website for ${business.name}: ${websiteUrl}`);
                }
              } else {
                console.log(`No website found for ${business.name}`);
              }
              
            } catch (err) {
              console.log(`Error fetching page for ${business.name}: ${err.message}`);
            }
          }
          
          console.log(`Completed batch ${Math.ceil((i+1)/batchSize)}, updated ${updatedWebsiteCount} websites so far`);
          
          // Add a larger delay between batches
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`Error in fetchIndividualBusinessPages: ${error.message}`);
      }
      
      console.log(`Finished processing individual business pages. Updated ${updatedWebsiteCount} websites.`);
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