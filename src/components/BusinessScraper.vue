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
        const searchResponse = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        console.log("Response received:", searchResponse.status);
        
        const $ = cheerio.load(searchResponse.data);
        console.log("HTML loaded with cheerio");

        // First pass: collect basic business info and business page URLs
        const businessesBasicInfo = [];
        $("div.gz-list-card-wrapper").each((_, cardWrapper) => {
          const cardElement = $(cardWrapper);
          
          // Extract name
          const nameElement = cardElement.find("h5.card-title a");
          const name = nameElement.text().trim();
          const businessPageUrl = nameElement.attr("href");
          
          // Process the business page URL
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

          // Extract website directly from the search results
          let website = "n/a";
          
          // Look for website in the dedicated website section first
          const websiteElement = cardElement.find("li.gz-card-website a");
          if (websiteElement.length > 0 && websiteElement.attr("href")) {
            website = websiteElement.attr("href");
            console.log(`Found website directly for ${name}: ${website}`);
          }
          
          // If no website found, look for any links that might be websites
          if (website === "n/a") {
            cardElement.find("a").each((_, link) => {
              const href = $(link).attr("href") || "";
              const linkText = $(link).text().trim().toLowerCase();
              
              // Check for obvious website links by text content
              if ((linkText.includes("website") || 
                   linkText.includes("visit site") || 
                   linkText.includes("view site") || 
                   linkText === "site") && 
                  href && !href.includes("wilmingtonchamber.org")) {
                website = href;
                console.log(`Found website by link text for ${name}: ${website}`);
                return false; // Break each loop
              }
              
              // Check for links that appear to be external websites
              if (href && href.match(/^https?:\/\//) && 
                  !href.includes("google.com/maps") &&
                  !href.includes("facebook.com") &&
                  !href.includes("twitter.com") &&
                  !href.includes("instagram.com") &&
                  !href.includes("linkedin.com") &&
                  !href.includes("youtube.com") &&
                  !href.includes("wilmingtonchamber.org")) {
                website = href;
                console.log(`Found likely website URL for ${name}: ${website}`);
                return false; // Break each loop
              }
            });
          }
          
          // Try to extract from any dynamically loaded data in the card
          if (website === "n/a") {
            // Some chambers use data attributes to store website info
            const dataWebsite = cardElement.find("[data-website]").attr("data-website") ||
                               cardElement.find("[data-url]").attr("data-url") ||
                               cardElement.attr("data-website") || 
                               cardElement.attr("data-url");
            
            if (dataWebsite && dataWebsite.match(/^https?:\/\//)) {
              website = dataWebsite;
              console.log(`Found website in data attribute for ${name}: ${website}`);
            }
          }

          // Store all extracted information
          businessesBasicInfo.push({
            name,
            address: address || "Address not available",
            mapUrl,
            phone: phone || "Phone number not available",
            cocPageUrl,
            website
          });
        });

        console.log(`Found ${businessesBasicInfo.length} businesses.`);
        
        // Set businesses with the data we've extracted
        this.businesses = businessesBasicInfo;
        
        // Avoid trying to fetch individual business pages since that's causing CORS issues
        // Instead, we'll try one more approach to extract websites from search results
        await this.enhanceBusinessData(businessesBasicInfo);

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

    async enhanceBusinessData(businessesBasicInfo) {
      console.log("Enhancing business data from search results...");
      
      // Prepare a new request to try with different parameters that might include more business information
      // Some chambers include more data when requesting a view other than the default
      try {
        // Use the config values
        const corsProxy = config.corsProxy;
        const baseUrl = config.apiBaseUrls.wilmington.replace(/\/$/, '');
        
        // Try alternate search views/formats that might include more data
        const enhancedSearchUrl = `${corsProxy}${baseUrl}/list/search?q=${encodeURIComponent(this.searchTerm)}&c=&sa=False&v=grid`;
        
        console.log("Trying enhanced search URL:", enhancedSearchUrl);
        
        const enhancedResponse = await axios.get(enhancedSearchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const $ = cheerio.load(enhancedResponse.data);
        
        // Look for additional business data in the enhanced response
        $("div.gz-list-card-wrapper, div.gz-card").each((_, cardWrapper) => {
          const cardElement = $(cardWrapper);
          
          // Get business name to match with our existing data
          const nameElement = cardElement.find("h5.card-title a");
          const name = nameElement.text().trim();
          
          // Find the matching business in our array
          const businessIndex = this.businesses.findIndex(b => b.name === name);
          if (businessIndex === -1) return; // Skip if no match
          
          // Try to extract the website if it wasn't found before
          if (this.businesses[businessIndex].website === "n/a") {
            // Look for website in the dedicated website section first
            const websiteElement = cardElement.find("li.gz-card-website a, a.gz-card-website");
            if (websiteElement.length > 0 && websiteElement.attr("href")) {
              const website = websiteElement.attr("href");
              console.log(`Found website in enhanced search for ${name}: ${website}`);
              this.businesses[businessIndex].website = website;
            }
            
            // Try additional selectors for websites that might be present
            const alternateSelectors = [
              "a[itemprop='url']", 
              "a.gz-url", 
              "a.website-link",
              "a.business-website"
            ];
            
            for (const selector of alternateSelectors) {
              if (this.businesses[businessIndex].website !== "n/a") break;
              
              const element = cardElement.find(selector);
              if (element.length > 0 && element.attr("href")) {
                const website = element.attr("href");
                console.log(`Found website using selector ${selector} for ${name}: ${website}`);
                this.businesses[businessIndex].website = website;
              }
            }
          }
        });
        
        console.log("Finished enhancing business data");
        
        // As a last resort, try to use Google search for those businesses still without websites
        await this.tryGoogleSearch();
        
      } catch (error) {
        console.error("Error enhancing business data:", error);
      }
    },
    
    async tryGoogleSearch() {
      // For businesses that still don't have websites, suggest users try Google search
      const businessesWithoutWebsites = this.businesses.filter(b => b.website === "n/a");
      
      if (businessesWithoutWebsites.length > 0) {
        console.log(`${businessesWithoutWebsites.length} businesses still don't have websites after enhancement.`);
        
        // Add Google search links to businesses without websites
        businessesWithoutWebsites.forEach(business => {
          const index = this.businesses.findIndex(b => b.name === business.name);
          if (index !== -1) {
            const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(business.name)}`;
            this.businesses[index].website = googleSearchUrl;
            console.log(`Added Google search link for ${business.name}`);
          }
        });
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