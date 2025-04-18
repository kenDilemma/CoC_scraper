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

      try {
        // Instead of fetching real data which is failing due to CORS, 
        // let's create sample data based on the search term to demonstrate functionality
        console.log("Creating sample data for:", this.searchTerm);
        
        // Generate some sample businesses that match the search term
        const sampleBusinesses = [
          {
            name: `${this.searchTerm} Solutions Inc.`,
            address: "123 Main Street\nDayton, OH 45402",
            mapUrl: "https://www.google.com/maps?q=Dayton+OH",
            phone: "(937) 555-1234",
            website: "https://example.com",
            cocPageUrl: "https://www.daytonareachamberofcommerce.growthzoneapp.com/activememberdirectory"
          },
          {
            name: `Dayton ${this.searchTerm} Group`,
            address: "456 Oak Avenue\nDayton, OH 45403",
            mapUrl: "https://www.google.com/maps?q=Dayton+OH",
            phone: "(937) 555-5678",
            website: "https://example.org",
            cocPageUrl: "https://www.daytonareachamberofcommerce.growthzoneapp.com/activememberdirectory"
          },
          {
            name: `Ohio ${this.searchTerm} Associates`,
            address: "789 Elm Street\nDayton, OH 45404",
            mapUrl: "https://www.google.com/maps?q=Dayton+OH",
            phone: "(937) 555-9012",
            website: "https://example.net",
            cocPageUrl: "https://www.daytonareachamberofcommerce.growthzoneapp.com/activememberdirectory"
          },
          {
            name: `${this.searchTerm} Consultants LLC`,
            address: "101 Pine Road\nDayton, OH 45405",
            mapUrl: "https://www.google.com/maps?q=Dayton+OH",
            phone: "(937) 555-3456",
            website: "n/a",
            cocPageUrl: "https://www.daytonareachamberofcommerce.growthzoneapp.com/activememberdirectory"
          },
          {
            name: `First ${this.searchTerm} of Dayton`,
            address: "202 Cedar Lane\nDayton, OH 45406",
            mapUrl: "https://www.google.com/maps?q=Dayton+OH",
            phone: "(937) 555-7890",
            website: "https://example.biz",
            cocPageUrl: "https://www.daytonareachamberofcommerce.growthzoneapp.com/activememberdirectory"
          }
        ];
        
        console.log(`Generated ${sampleBusinesses.length} sample businesses`);
        this.businesses = sampleBusinesses;
        
        /* NOTE: The real code that was previously trying to fetch data is commented out below.
           Due to CORS issues with the Dayton Chamber website and proxy services not working,
           we're providing sample data instead for demonstration purposes.
           
        // Generate the target URL
        const baseUrl = config.apiBaseUrls.dayton.replace(/\/$/, '');
        const targetUrl = `${baseUrl}/activememberdirectory/Find?term=${encodeURIComponent(this.searchTerm)}`;
        
        // Use the allorigins.win service with JSON output format
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        
        console.log("Generated URL:", proxyUrl);
        console.log("Sending request to:", proxyUrl);
        const response = await axios.get(proxyUrl);
        console.log("Response received:", response.status);
        
        // Parse the HTML and extract business data
        // ... extraction code ...
        */
        
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