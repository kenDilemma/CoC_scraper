#!/usr/bin/env node

/**
 * City Component Generator
 * 
 * This script generates a new city component using the BaseBusinessScraper template.
 * It creates a standardized component that automatically follows the correct layout and styling.
 * 
 * Usage:
 *   node scripts/generate-city.js <city-name> <city-id> [--type=growthzone|custom]
 * 
 * Examples:
 *   node scripts/generate-city.js "Miami" "miami" --type=growthzone
 *   node scripts/generate-city.js "Boston" "boston" --type=custom
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template for GrowthZone cities (most common)
const generateGrowthZoneComponent = (cityName, cityId) => {
  return `<template>
  <BaseBusinessScraper city-key="${cityId}" />
</template>

<script>
import BaseBusinessScraper from './BaseBusinessScraper.vue';

export default {
  name: 'BusinessScraper-${cityName.replace(/\s+/g, '')}',
  components: {
    BaseBusinessScraper
  }
};
</script>
`;
};

// Template for custom parsing cities
const generateCustomComponent = (cityName, cityId) => {
  return `<template>
  <BaseBusinessScraper city-key="${cityId}" />
</template>

<script>
import BaseBusinessScraper from './BaseBusinessScraper.vue';

export default {
  name: 'BusinessScraper-${cityName.replace(/\s+/g, '')}',
  components: {
    BaseBusinessScraper
  }
};
</script>

<!-- 
  Note: This city uses custom parsing.
  Add the custom parser function to config.js in the cities array.
  Example:
  
  {
    id: '${cityId}',
    name: '${cityName}',
    baseUrl: 'https://chamber-url.com',
    searchPath: '/directory',
    searchParams: (term) => \`?search=\${encodeURIComponent(term)}\`,
    type: 'custom',
    customParser: parse${cityName.replace(/\s+/g, '')}Businesses,
    selectors: {
      // Document your selectors here for reference
    }
  }
-->
`;
};

// Configuration template for config.js
const generateConfigEntry = (cityName, cityId, type) => {
  if (type === 'growthzone') {
    return `    {
      id: '${cityId}',
      name: '${cityName}',
      baseUrl: 'https://CHAMBER-URL.com', // UPDATE THIS
      searchPath: '/list/search', // UPDATE IF NEEDED
      searchParams: (term) => \`?q=\${encodeURIComponent(term)}&c=&sa=False\`,
      type: 'growthzone-list',
      selectors: {
        cardWrapper: 'div.gz-list-card-wrapper',
        businessName: 'h5.card-title a',
        businessUrl: 'h5.card-title a',
        addressElement: 'li.gz-card-address',
        streetAddress: 'span.gz-street-address',
        cityStateZip: 'div[itemprop="citystatezip"]',
        cityElement: 'span.gz-address-city',
        phoneElement: 'li.gz-card-phone a',
        websiteElement: 'a:contains("Visit Website")'
      }
    }`;
  } else {
    return `    {
      id: '${cityId}',
      name: '${cityName}',
      baseUrl: 'https://CHAMBER-URL.com', // UPDATE THIS
      searchPath: '/directory', // UPDATE THIS
      searchParams: (term) => \`?search=\${encodeURIComponent(term)}\`, // UPDATE THIS
      type: 'custom',
      customParser: parse${cityName.replace(/\s+/g, '')}Businesses, // ADD PARSER FUNCTION
      selectors: {
        // Document your selectors here for reference
        cardWrapper: 'UPDATE_THIS',
        businessName: 'UPDATE_THIS',
        businessUrl: 'UPDATE_THIS',
        phoneElement: 'UPDATE_THIS',
        websiteElement: 'UPDATE_THIS',
        addressElement: 'UPDATE_THIS'
      }
    }`;
  }
};

// Custom parser template
const generateCustomParser = (cityName, cityId) => {
  return `
// Custom parser for ${cityName}
const parse${cityName.replace(/\s+/g, '')}Businesses = async (html, searchTerm) => {
  const $ = cheerio.load(html);
  const businesses = [];
  const businessNames = new Set();

  console.log('[${cityId.toUpperCase()}] Parsing HTML for businesses...');
  console.log('[${cityId.toUpperCase()}] HTML length:', html.length);
  
  // TODO: Update these selectors based on the actual website structure
  $('UPDATE_SELECTOR_HERE').each((index, element) => {
    const $element = $(element);
    const nameElement = $element.find('UPDATE_NAME_SELECTOR').first();
    const name = nameElement.text().trim();
    
    if (name && !businessNames.has(name)) {
      businessNames.add(name);
      
      const business = {
        name: name,
        address: null,
        phone: null,
        website: null,
        contactPerson: null,
        email: null,
        chamberUrl: null,
        mapUrl: null,
        phoneUrl: null
      };

      // TODO: Add parsing logic for each field
      // Example:
      // const phoneText = $element.find('UPDATE_PHONE_SELECTOR').text().trim();
      // if (phoneText.match(/\\d{3}[-.]?\\d{3}[-.]?\\d{4}/)) {
      //   business.phone = phoneText;
      //   business.phoneUrl = \`tel:\${phoneText.replace(/\\D/g, '')}\`;
      // }

      businesses.push(business);
    }
  });

  console.log(\`[${cityId.toUpperCase()}] Found \${businesses.length} businesses\`);
  return businesses;
};`;
};

// Main function
const generateCity = () => {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node scripts/generate-city.js <city-name> <city-id> [--type=growthzone|custom]');
    console.error('Example: node scripts/generate-city.js "Miami" "miami" --type=growthzone');
    process.exit(1);
  }

  const cityName = args[0];
  const cityId = args[1];
  const typeArg = args.find(arg => arg.startsWith('--type='));
  const type = typeArg ? typeArg.split('=')[1] : 'growthzone';

  if (!['growthzone', 'custom'].includes(type)) {
    console.error('Type must be either "growthzone" or "custom"');
    process.exit(1);
  }

  // Generate component
  const componentContent = type === 'growthzone' 
    ? generateGrowthZoneComponent(cityName, cityId)
    : generateCustomComponent(cityName, cityId);

  const componentPath = path.join(__dirname, '../src/components', `BusinessScraper-${cityName.replace(/\s+/g, '')}.vue`);
  
  fs.writeFileSync(componentPath, componentContent);
  console.log(`✅ Created component: ${componentPath}`);

  // Generate config entry
  const configEntry = generateConfigEntry(cityName, cityId, type);
  console.log('\n📋 Add this to your config.js cities array:');
  console.log(configEntry);

  // Generate custom parser if needed
  if (type === 'custom') {
    const parserCode = generateCustomParser(cityName, cityId);
    console.log('\n🔧 Add this custom parser to config.js:');
    console.log(parserCode);
  }

  console.log(`\n🎉 ${cityName} component generated successfully!`);
  console.log('\nNext steps:');
  console.log('1. Update the baseUrl and other config values in config.js');
  console.log('2. Add the new city to App.vue tabs');
  console.log('3. Import the component in App.vue');
  if (type === 'custom') {
    console.log('4. Implement the custom parser function');
    console.log('5. Test and adjust selectors as needed');
  }
};

generateCity();
