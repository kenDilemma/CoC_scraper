<template>
  <div class="min-h-screen bg-gray-800 flex flex-col items-center justify-center">
    <!-- Main Content -->
    <main class="flex flex-col items-center">
      <!-- Component will be rendered here -->
      <component :is="activeComponent"></component>
      
      <!-- Tabs moved down, now rendered after the component -->
      <div class="w-full max-w-md mt-4 flex flex-wrap justify-center gap-2 px-4">
        <button 
          v-for="city in cities"
          :key="city.id"
          @click="activeComponent = city.component" 
          class="font-bold py-2 px-4 rounded text-sm transition-opacity duration-200 flex-shrink-0 min-w-0"
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
import NewYork from './components/BusinessScraper-NYC.vue'
import Roanoke from './components/BusinessScraper-Roanoke.vue'
import LakeNorman from './components/BusinessScraper-LakeNorman.vue'
import config from './config.js'

export default {
  components: {
    Wilmington,
    Dayton,
    HuntingtonBeach,
    NewYork,
    Roanoke,
    LakeNorman
  },
  data() {
    return {
      activeComponent: 'wilmington',
      cities: [
        { id: 'wilmington', name: 'Wilmington', component: 'Wilmington' },
        { id: 'dayton', name: 'Dayton', component: 'Dayton' },
        { id: 'huntington-beach', name: 'Huntington Beach', component: 'HuntingtonBeach' },
        { id: 'new-york', name: 'New York', component: 'NewYork' },
        { id: 'roanoke', name: 'Roanoke', component: 'Roanoke' },
        { id: 'lake-norman', name: 'Lake Norman', component: 'LakeNorman' }
      ]
    }
  }
}
</script>

<style>
@import './assets/main.css';

/* Additional global styles can be added here */
</style>