<template>
  <div class="flex flex-col bg-gray-800">
    <!-- Favicon Icon - centered above main content -->
    <div class="flex justify-center pt-8 pb-4">
      <img src="../assets/favicon/favicon.svg" alt="COC Scraper" style="width: 216px;" />
    </div>
    
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
        :disabled="loading"
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
        <div v-if="business.address" class="mb-2 flex">
          <i class="fas fa-map-marker-alt text-blue-400 w-6 mt-1"></i>
          <div class="flex flex-col">
            <a :href="getGoogleMapsUrl(business.name, business.address)" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="text-pink-300 hover:underline">
              <div>{{ business.address.split('\n')[0] }}</div>
              <div>{{ business.address.split('\n')[1] }}</div>
            </a>
          </div>
        </div>
        
        <!-- Phone with phone icon -->
        <div v-if="business.phone" class="mb-2 flex">
          <i class="fas fa-phone text-blue-400 w-6 mt-1"></i>
          <div>
            <a :href="'tel:' + business.phone.replace(/\D/g, '')" 
               class="text-pink-300 hover:underline">
              {{ business.phone }}
            </a>
          </div>
        </div>
        
        <!-- Website with globe icon -->
        <div v-if="business.website" class="mb-2 flex">
          <i class="fas fa-globe text-blue-400 w-6 mt-1"></i>
          <div>
            <a :href="business.website" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="text-pink-300 hover:underline break-all">
              {{ business.website }}
            </a>
          </div>
        </div>
        
        <!-- Contact Person with user icon -->
        <div v-if="business.contactPerson" class="mb-2 flex">
          <i class="fas fa-user text-blue-400 w-6 mt-1"></i>
          <div class="text-gray-300">{{ business.contactPerson }}</div>
        </div>
        
        <!-- CoC Page as a simple hyperlink -->
        <div v-if="business.chamberUrl" class="flex">
          <i class="fas fa-building text-blue-400 w-6 mt-1"></i>
          <div>
            <a :href="business.chamberUrl" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="text-pink-300 hover:underline">
              CoC Page
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- No Results Message -->
    <div v-else-if="!loading && searchTerm && businesses.length === 0" class="text-center text-gray-400 py-4">
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
      loading: false,
      error: null,
      cityConfig: getCityConfig('new-york'),
      windowWidth: window.innerWidth
    };
  },
  mounted() {
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    handleResize() {
      this.windowWidth = window.innerWidth;
    },
    resetSearch() {
      this.searchTerm = '';
      this.businesses = [];
      this.error = null;
    },

    async fetchBusinesses() {
      if (!this.searchTerm.trim()) return;

      this.loading = true;
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
        this.loading = false;
      }
    },

    async fetchWithProxy(url) {
      const proxies = [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
      ];

      for (const proxy of proxies) {
        try {
          const proxyUrl = getProxyUrl(proxy, url);
          console.log(`Trying proxy: ${proxyUrl}`);
          
          const response = await axios.get(proxyUrl, {
            timeout: 15000
          });
          
          console.log(`Success with proxy: ${proxy}`);
          
          // Handle different proxy response formats
          if (proxy.includes('allorigins.win/get')) {
            return { data: response.data.contents };
          }
          
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
      const businessNames = new Set(); // Track unique business names

      console.log('Parsing HTML for businesses...');
      console.log('HTML length:', html.length);
      console.log('HTML sample (first 500 chars):', html.substring(0, 500));
      
      // Debug: Check what we actually got
      const totalDivs = $('div').length;
      const divsWithH3 = $('div').filter((i, el) => $(el).find('h3').length > 0).length;
      const h3Count = $('h3').length;
      
      console.log(`Total divs: ${totalDivs}, Divs with h3: ${divsWithH3}, Total h3s: ${h3Count}`);
      
      // Check for the specific selector you mentioned
      const specificDiv = $('div.bg-gray-600:nth-child(2)');
      console.log(`Found divs matching 'div.bg-gray-600:nth-child(2)': ${specificDiv.length}`);
      if (specificDiv.length > 0) {
        console.log('Content of specific div:', specificDiv.first().html());
      }
      
      // Look for more specific business container selectors
      $('div[class*="business"], div[class*="member"], div[class*="directory"], div[class*="listing"], div.bg-gray-600:nth-child(2)').each((index, element) => {
        const $element = $(element);
        const h3 = $element.find('h3').first();
        
        if (h3.length > 0) {
          const name = h3.text().trim();
          console.log(`Found business candidate: "${name}"`);
          
          if (name && name.length > 0 && !businessNames.has(name)) {
            businessNames.add(name); // Prevent duplicates
            
            const business = {
              name: name,
              contactPerson: null,
              phone: null,
              website: null,
              address: null,
              chamberUrl: null
            };

            $element.find('p').each((i, p) => {
              const text = $(p).text().trim();
              
              if (!text) return;
              
              if (text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/)) {
                business.phone = text;
              }
              else if (text.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Place|Pl|Court|Ct)/i)) {
                business.address = text;
              }
              else if (!business.contactPerson && text.match(/[A-Za-z\s]{3,}/) && !text.includes('http')) {
                business.contactPerson = text;
              }
            });

            $element.find('a[href^="http"]').each((i, link) => {
              const href = $(link).attr('href');
              if (href && !href.includes('chamber.nyc')) {
                business.website = href;
              }
            });

            const chamberLink = $element.find('a[href*="chamber.nyc"]').first();
            if (chamberLink.length > 0) {
              business.chamberUrl = chamberLink.attr('href');
            }

            businesses.push(business);
          }
        }
      });

      // If the specific selector didn't work, fall back to the general div approach but with better filtering
      if (businesses.length === 0) {
        console.log('No businesses found with specific selectors, trying general approach...');
        
        $('div').each((index, element) => {
          const $element = $(element);
          const h3 = $element.find('h3').first();
          
          if (h3.length > 0) {
            const name = h3.text().trim();
            if (name && name.length > 0 && !businessNames.has(name)) {
              console.log(`Found business candidate (general): "${name}"`);
              businessNames.add(name);
              
              const business = {
                name: name,
                contactPerson: null,
                phone: null,
                website: null,
                address: null,
                chamberUrl: null
              };

              $element.find('p').each((i, p) => {
                const text = $(p).text().trim();
                
                if (!text) return;
                
                if (text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/)) {
                  business.phone = text;
                }
                else if (text.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Place|Pl|Court|Ct)/i)) {
                  business.address = text;
                }
                else if (!business.contactPerson && text.match(/[A-Za-z\s]{3,}/) && !text.includes('http')) {
                  business.contactPerson = text;
                }
              });

              $element.find('a[href^="http"]').each((i, link) => {
                const href = $(link).attr('href');
                if (href && !href.includes('chamber.nyc')) {
                  business.website = href;
                }
              });

              const chamberLink = $element.find('a[href*="chamber.nyc"]').first();
              if (chamberLink.length > 0) {
                business.chamberUrl = chamberLink.attr('href');
              }

              businesses.push(business);
            }
          }
        });
      }

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
</style>