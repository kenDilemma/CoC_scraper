<template>
  <BaseBusinessScraper city-key="new-york" />
</template>

<script>
import BaseBusinessScraper from './BaseBusinessScraper.vue';

export default {
  name: 'BusinessScraper-NYC',
  components: {
    BaseBusinessScraper
  }
};
</script>

<!-- 
  This component now uses the BaseBusinessScraper template system.
  The custom parsing logic is handled by parseNYCBusinesses in config.js.
  All styling and layout is standardized and matches other cities exactly.
-->