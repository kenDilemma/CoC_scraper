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
        :key="business.id"
        class="bg-gray-600 p-4 rounded shadow-md flex flex-col"
      >
        <div class="flex items-start justify-between mb-2">
          <h3 class="text-lg font-bold text-white">{{ business.name }}</h3>
          <a
            v-if="business.cocPageUrl && business.cocPageUrl !== '#'"
            :href="business.cocPageUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-400 hover:underline flex items-center"
          >
            <i class="fas fa-external-link-alt text-sm"></i>
          </a>
        </div>
        
        <!-- Address with map icon -->
        <div class="mb-2 flex">
          <i class="fas fa-map-marker-alt text-blue-400 w-6 mt-1"></i>
          <div class="flex flex-col">
            <template v-if="business.address === 'Address not available'">
              {{ business.address }}
            </template>
            <a v-else :href="business.mapUrl" target="_blank" class="text-pink-300 hover:underline">
              <div>{{ business.address.split('\n')[0] }}</div>
              <div>{{ business.address.split('\n')[1] }}</div>
            </a>
          </div>
        </div>
        
        <!-- Phone with phone icon -->
        <div class="mb-2 flex">
          <i class="fas fa-phone text-blue-400 w-6 mt-1"></i>
          <div>
            <template v-if="business.phone === 'Phone number not available' || !business.phoneUrl">
              {{ business.phone }}
            </template>
            <a v-else :href="business.phoneUrl" class="text-pink-300 hover:underline">
              {{ business.phone }}
            </a>
          </div>
        </div>
        
        <!-- Website with globe icon -->
        <div v-if="business.website" class="mb-2 flex">
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
  name: 'BusinessScraperHB',
  data() {
    return {
      businesses: [],
      searchTerm: '',
      loading: false,
      error: null,
      windowWidth: window.innerWidth,
      cityConfig: config.getCityConfig('huntington-beach')
    };
  },
  mounted() {
    window.addEventListener('resize', this.updateWindowWidth);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateWindowWidth);
  },
  methods: {
    updateWindowWidth() {
      this.windowWidth = window.innerWidth;
    },
    async fetchBusinesses() {
      this.loading = true;
      this.error = null;
      
      try {
        const searchUrl = `${this.cityConfig.baseUrl}${this.cityConfig.searchPath}${this.cityConfig.searchParams(this.searchTerm)}`;
        const proxiedUrl = `${config.corsProxy}${encodeURIComponent(searchUrl)}`;
        
        const response = await axios.get(proxiedUrl);
        
        if (response.data) {
          this.businesses = this.parseBusinesses(response.data);
        }
      } catch (error) {
        console.error('Error fetching businesses:', error);
        this.error = 'Failed to fetch businesses. Please try again.';
      } finally {
        this.loading = false;
      }
    },
    parseBusinesses(html) {
      const $ = cheerio.load(html);
      const businesses = [];
      
      const selectors = this.cityConfig.selectors;
      
      $(selectors.cardWrapper).each((index, element) => {
        const $element = $(element);
        
        // Extract business name
        const nameElement = $element.find(selectors.businessName);
        const name = nameElement.text().trim();
        
        // Extract business URL for CoC page
        const businessUrl = nameElement.attr('href');
        const cocPageUrl = businessUrl ? (businessUrl.startsWith('http') ? businessUrl : `${this.cityConfig.baseUrl}${businessUrl}`) : '#';
        
        // Extract address components
        const addressElement = $element.find(selectors.addressElement);
        let address = '';
        
        if (addressElement.length) {
          const streetElement = addressElement.find(selectors.streetAddress);
          const cityStateZipElement = addressElement.find(selectors.cityStateZip);
          
          const street = streetElement.text().trim();
          const cityStateZip = cityStateZipElement.text().trim();
          
          if (street && cityStateZip) {
            address = `${street}\n${cityStateZip}`;
          } else {
            address = addressElement.text().trim();
          }
        }
        
        // Extract phone number
        const phoneElement = $element.find(selectors.phoneElement);
        let phone = '';
        let phoneUrl = '';
        
        if (phoneElement.length) {
          phone = phoneElement.text().trim();
          phoneUrl = phoneElement.attr('href') || `tel:${phone.replace(/\D/g, '')}`;
        }
        
        // Set default values for missing information
        if (!phone) {
          phone = 'Phone number not available';
          phoneUrl = '';
        }
        
        if (!address) {
          address = 'Address not available';
        }
        
        // Create Google Maps URL with business name for better search results
        const mapUrl = address !== 'Address not available' ? 
          `https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + address)}` :
          '';
        
        if (name) {
          businesses.push({
            name,
            address,
            phone,
            phoneUrl,
            mapUrl,
            cocPageUrl,
            website: null // Will be populated if we add website parsing
          });
        }
      });
      
      return businesses;
    },
    resetSearch() {
      this.businesses = [];
      this.searchTerm = '';
      this.error = null;
    }
  }
};
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
