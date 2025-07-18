<template>
  <div class="min-h-screen bg-gray-800 flex flex-col items-center justify-center">
    <!-- Main Content -->
    <main class="flex flex-col items-center">
      <!-- Component will be rendered here -->
      <component :is="activeComponent"></component>
      
      <!-- Tabs moved down, now rendered after the component -->
      <div class="w-full max-w-md mt-4 flex justify-center space-x-3">
        <button 
          v-for="city in cities"
          :key="city.id"
          @click="activeComponent = city.component" 
          class="font-bold py-1 px-3 rounded text-sm transition-opacity duration-200"
          :class="activeComponent === city.component 
            ? 'bg-blue-500 hover:bg-blue-700 text-white opacity-100' 
            : 'bg-blue-500 hover:bg-blue-700 text-white opacity-50'"
        >
          {{ city.name }}
        </button>
      </div>
    </main>
  </div>
</template>

<script>
import Wilmington from './components/BusinessScraper.vue'
import Dayton from './components/BusinessScraper-DYT.vue'
import HuntingtonBeach from './components/BusinessScraper-HB.vue'
import config from './config.js'

export default {
  components: {
    Wilmington,
    Dayton,
    HuntingtonBeach
  },
  data() {
    return {
      activeComponent: 'wilmington',
      cities: [
        { id: 'wilmington', name: 'Wilmington', component: 'Wilmington' },
        { id: 'dayton', name: 'Dayton', component: 'Dayton' },
        { id: 'huntington-beach', name: 'Huntington Beach', component: 'HuntingtonBeach' }
      ]
    }
  }
}
</script>

<style>
@import './assets/main.css';

/* Additional global styles can be added here */
</style>