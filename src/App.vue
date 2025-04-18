<template>
  <div class="min-h-screen bg-gray-800 flex flex-col items-center justify-center">
    <!-- Main Content -->
    <main class="flex flex-col items-center">
      <!-- Component will be rendered here -->
      <component :is="activeComponent"></component>
      
      <!-- Tabs moved down, now rendered after the component -->
      <div class="w-72 mt-4 flex justify-center space-x-3">
        <button 
          @click="activeComponent = 'wilmington'" 
          class="font-bold py-1 px-3 rounded text-sm transition-opacity duration-200"
          :class="activeComponent === 'wilmington' 
            ? 'bg-blue-500 hover:bg-blue-700 text-white opacity-100' 
            : 'bg-blue-500 hover:bg-blue-700 text-white opacity-50'"
        >
          Wilmington
        </button>
        <button 
          @click="activeComponent = 'dayton'" 
          class="font-bold py-1 px-3 rounded text-sm transition-opacity duration-200"
          :class="activeComponent === 'dayton' 
            ? 'bg-blue-500 hover:bg-blue-700 text-white opacity-100' 
            : 'bg-blue-500 hover:bg-blue-700 text-white opacity-50'"
        >
          Dayton
        </button>
      </div>
    </main>
  </div>
</template>

<script>
import Wilmington from './components/BusinessScraper.vue'
import Dayton from './components/BusinessScraper-DYT.vue'

export default {
  components: {
    Wilmington,
    Dayton
  },
  data() {
    return {
      activeComponent: 'wilmington'
    }
  }
}
</script>

<style>
@import './assets/main.css';

/* Additional global styles can be added here */
</style>