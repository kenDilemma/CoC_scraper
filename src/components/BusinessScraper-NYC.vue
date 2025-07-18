<template>
  <div class="bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto">
    <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">New York Chamber of Commerce</h2>
    
    <!-- Search Input -->
    <div class="mb-6">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Search for businesses..."
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <!-- Search Button -->
    <div class="mb-6">
      <button
        @click="searchBusinesses"
        :disabled="isLoading"
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {{ isLoading ? 'Searching...' : 'Search Businesses' }}
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
      <p class="text-red-700">{{ error }}</p>
    </div>

    <!-- Results -->
    <div v-if="businesses.length > 0" class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Search Results:</h3>
      
      <div v-for="business in businesses" :key="business.name" class="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div class="flex items-center mb-2">
          <i class="fas fa-building text-blue-600 mr-2"></i>
          <h4 class="font-semibold text-gray-800">{{ business.name }}</h4>
        </div>
        
        <div v-if="business.contactPerson" class="flex items-center mb-2">
          <i class="fas fa-user text-gray-600 mr-2"></i>
          <span class="text-gray-700">{{ business.contactPerson }}</span>
        </div>
        
        <div v-if="business.phone" class="flex items-center mb-2">
          <i class="fas fa-phone text-blue-600 mr-2"></i>
          <a :href="'tel:' + business.phone.replace(/\D/g, '')" 
             class="text-pink-600 hover:text-pink-800 font-medium">
            {{ business.phone }}
          </a>
        </div>
        
        <div v-if="business.website" class="flex items-center mb-2">
          <i class="fas fa-globe text-blue-600 mr-2"></i>
          <a :href="business.website" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="text-pink-600 hover:text-pink-800 font-medium">
            Visit Website
          </a>
        </div>
        
        <div v-if="business.address" class="flex items-center mb-2">
          <i class="fas fa-map-marker-alt text-blue-600 mr-2"></i>
          <a :href="getGoogleMapsUrl(business.name, business.address)" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="text-pink-600 hover:text-pink-800 font-medium">
            {{ business.address }}
          </a>
        </div>
        
        <div v-if="business.chamberUrl" class="flex items-center">
          <i class="fas fa-external-link-alt text-blue-600 mr-2"></i>
          <a :href="business.chamberUrl" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="text-pink-600 hover:text-pink-800 font-medium">
            View Chamber Profile
          </a>
        </div>
      </div>
    </div>

    <!-- No Results Message -->
    <div v-else-if="!isLoading && searchTerm && businesses.length === 0" class="text-center text-gray-500 py-4">
      No businesses found for "{{ searchTerm }}"
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCityConfig, getProxyUrl } from '../config.js';

export default {
  name: 'BusinessScraper-NYC',
  data() {
    return {
      searchTerm: '',
      businesses: [],
      isLoading: false,
      error: null,
      cityConfig: getCityConfig('new-york')
    };
  },
  methods: {
    async searchBusinesses() {
      if (!this.searchTerm.trim()) return;

      this.isLoading = true;
      this.error = null;
      this.businesses = [];

      try {
        const url = `${this.cityConfig.baseUrl}${this.cityConfig.searchPath}${this.cityConfig.searchParams(this.searchTerm)}`;
        console.log('Searching URL:', url);
        
        const response = await this.fetchWithProxy(url);
        this.parseBusinesses(response.data);
      } catch (err) {
        console.error('Search error:', err);
        this.error = 'Failed to search businesses. Please try again.';
      } finally {
        this.isLoading = false;
      }
    },

    async fetchWithProxy(url) {
      const proxies = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/'
      ];

      for (const proxy of proxies) {
        try {
          const proxyUrl = getProxyUrl(proxy, url);
          console.log(`Trying proxy: ${proxyUrl}`);
          
          const response = await axios.get(proxyUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          console.log(`Success with proxy: ${proxy}`);
          return response;
        } catch (err) {
          console.log(`Proxy failed: ${proxy}`, err.message);
          continue;
        }
      }
      
      throw new Error('All proxy attempts failed');
    },

    parseBusinesses(html) {
      const $ = cheerio.load(html);
      const businesses = [];

      console.log('Parsing HTML for businesses...');
      
      // NYC Chamber has a different structure - look for business entries
      $('div').each((index, element) => {
        const $element = $(element);
        const h3 = $element.find('h3').first();
        
        if (h3.length > 0) {
          const name = h3.text().trim();
          if (name && name.length > 0) {
            const business = {
              name: name,
              contactPerson: null,
              phone: null,
              website: null,
              address: null,
              chamberUrl: null
            };

            // Look for contact person, phone, and address in subsequent paragraphs
            $element.find('p').each((i, p) => {
              const text = $(p).text().trim();
              
              // Skip empty paragraphs
              if (!text) return;
              
              // Phone number detection (contains digits and common phone patterns)
              if (text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/)) {
                business.phone = text;
              }
              // Address detection (contains street patterns)
              else if (text.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Place|Pl|Court|Ct)/i)) {
                business.address = text;
              }
              // Contact person (if not phone or address, likely a person's name)
              else if (!business.contactPerson && text.match(/[A-Za-z\s]{3,}/) && !text.includes('http')) {
                business.contactPerson = text;
              }
            });

            // Look for website links
            $element.find('a[href^="http"]').each((i, link) => {
              const href = $(link).attr('href');
              if (href && !href.includes('chamber.nyc')) {
                business.website = href;
              }
            });

            // Add chamber URL if available
            const chamberLink = $element.find('a[href*="chamber.nyc"]').first();
            if (chamberLink.length > 0) {
              business.chamberUrl = chamberLink.attr('href');
            }

            businesses.push(business);
          }
        }
      });

      console.log(`Found ${businesses.length} businesses`);
      this.businesses = businesses;
    },

    getGoogleMapsUrl(businessName, address) {
      const query = encodeURIComponent(`${businessName} ${address}`);
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
  }
};
</script>

<style scoped>
/* Component-specific styles if needed */
</style>
