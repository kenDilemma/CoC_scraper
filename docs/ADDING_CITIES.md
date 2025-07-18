# Chamber of Commerce Scraper - Adding New Cities

This document explains the systematized process for adding new cities to the Chamber of Commerce scraper. The system ensures that all cities follow identical layout, styling, and behavior patterns.

## System Overview

The scraper now uses a **Base Component Template** system that provides:
- ✅ **Identical Layout**: All cities use the same grid layout, card design, and responsive behavior
- ✅ **Consistent Styling**: Standardized colors, icons, spacing, and typography
- ✅ **Unified Data Structure**: All business data follows the same format
- ✅ **Flexible Parsing**: Support for both GrowthZone and custom website structures
- ✅ **Easy Maintenance**: Changes to layout/styling are applied to all cities automatically

## City Types

### 1. GrowthZone Cities (Most Common)
Cities that use the GrowthZone platform (like Wilmington, Dayton, Huntington Beach).
- **Characteristics**: Similar HTML structure, `.gz-` CSS classes
- **Setup Time**: ~5 minutes
- **Parsing**: Uses standardized GrowthZone parser

### 2. Custom Cities
Cities with unique website structures (like NYC).
- **Characteristics**: Custom HTML structure, requires specific parsing logic
- **Setup Time**: ~15-30 minutes
- **Parsing**: Requires custom parser function

## Quick Start: Adding a New City

### Step 1: Generate Component
```bash
# For GrowthZone cities (most common)
node scripts/generate-city.js "Miami" "miami" --type=growthzone

# For custom parsing cities
node scripts/generate-city.js "Boston" "boston" --type=custom
```

### Step 2: Update Configuration
Add the generated config entry to `src/config.js`:

```javascript
// Add to the cities array in config.js
{
  id: 'miami',
  name: 'Miami',
  baseUrl: 'https://miamichamber.com', // UPDATE THIS URL
  searchPath: '/list/search',
  searchParams: (term) => `?q=${encodeURIComponent(term)}&c=&sa=False`,
  type: 'growthzone-list',
  selectors: {
    // Standard GrowthZone selectors (usually don't need changes)
  }
}
```

### Step 3: Add to App.vue
```vue
<!-- Add tab button -->
<button @click="activeTab = 'miami'" :class="tabClass('miami')">
  Miami
</button>

<!-- Add component -->
<BusinessScraperMiami v-if="activeTab === 'miami'" />

<!-- Import component -->
import BusinessScraperMiami from './components/BusinessScraper-Miami.vue';
```

### Step 4: Test
1. Save all files
2. Navigate to the new city tab
3. Try searching for "bank" or "restaurant"
4. Verify results display correctly

## Detailed Setup Instructions

### For GrowthZone Cities

1. **Identify if it's GrowthZone**: Look for URLs like `*.growthzoneapp.com` or search pages with `.gz-` CSS classes
2. **Generate component**: `node scripts/generate-city.js "City Name" "city-id" --type=growthzone`
3. **Update baseUrl**: Change the URL in config.js to the actual chamber website
4. **Test search path**: Verify the search URL format (usually `/list/search`)
5. **Add to App.vue**: Import component and add tab

**Time estimate**: 5-10 minutes

### For Custom Cities

1. **Generate component**: `node scripts/generate-city.js "City Name" "city-id" --type=custom`
2. **Research website structure**:
   - Visit the chamber's business directory
   - Use browser DevTools to inspect the HTML structure
   - Identify selectors for business name, address, phone, etc.
3. **Implement custom parser**:
   - Add the generated parser function to config.js
   - Update selectors based on your research
   - Test and refine parsing logic
4. **Update configuration**: Set correct baseUrl, searchPath, searchParams
5. **Add to App.vue**: Import component and add tab

**Time estimate**: 15-30 minutes

## Component Structure

All city components now follow this pattern:

```vue
<template>
  <BaseBusinessScraper city-key="city-id" />
</template>

<script>
import BaseBusinessScraper from './BaseBusinessScraper.vue';

export default {
  name: 'BusinessScraper-CityName',
  components: {
    BaseBusinessScraper
  }
};
</script>
```

The `BaseBusinessScraper` handles:
- ✅ Identical UI layout and styling
- ✅ Responsive grid behavior
- ✅ Loading states and error handling
- ✅ Proxy management and CORS handling
- ✅ Standard business data formatting

## Data Structure

All businesses are normalized to this format:

```javascript
{
  name: "Business Name",
  address: "123 Main St\nCity, State 12345", // Can be split on \n
  phone: "(555) 123-4567",
  website: "https://business.com",
  contactPerson: "John Smith", // Optional
  email: "info@business.com", // Optional
  chamberUrl: "https://chamber.com/business/123", // Link to chamber profile
  mapUrl: "https://maps.google.com/...", // Auto-generated
  phoneUrl: "tel:5551234567" // Auto-generated
}
```

## Custom Parser Template

For custom cities, implement this parser pattern:

```javascript
const parseCityBusinesses = async (html, searchTerm) => {
  const $ = cheerio.load(html);
  const businesses = [];
  const businessNames = new Set();

  console.log('[CITY] Parsing HTML for businesses...');
  
  // Update selector based on website structure
  $('.business-card, .member-item, .directory-entry').each((index, element) => {
    const $element = $(element);
    const name = $element.find('.business-name, h3, h4').text().trim();
    
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

      // Extract phone
      const phoneText = $element.find('.phone, .contact-phone').text().trim();
      if (phoneText.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
        business.phone = phoneText;
        business.phoneUrl = `tel:${phoneText.replace(/\D/g, '')}`;
      }

      // Extract address
      const addressText = $element.find('.address, .location').text().trim();
      if (addressText) {
        business.address = addressText;
        business.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + addressText)}`;
      }

      // Extract website
      const websiteLink = $element.find('a[href^="http"]').attr('href');
      if (websiteLink && !websiteLink.includes('chamber.domain')) {
        business.website = websiteLink;
      }

      // Extract chamber profile link
      const chamberLink = $element.find('a[href*="chamber"]').attr('href');
      if (chamberLink) {
        business.chamberUrl = chamberLink.startsWith('http') ? chamberLink : `https://chamber.domain${chamberLink}`;
      }

      businesses.push(business);
    }
  });

  console.log(`[CITY] Found ${businesses.length} businesses`);
  return businesses;
};
```

## Testing New Cities

1. **Basic Functionality**:
   - Search loads without errors
   - Results display in correct grid layout
   - Cards have proper styling and colors
   - Links work correctly (phone, map, website, chamber)

2. **Responsive Behavior**:
   - Mobile view shows 1 column
   - Desktop view shows 3 columns
   - Tabs wrap properly on small screens

3. **Data Quality**:
   - Business names are clean (no extra whitespace)
   - Phone numbers are properly formatted
   - Addresses contain useful information
   - No duplicate businesses appear

## Troubleshooting

### No Results Found
1. Check console for proxy errors
2. Verify baseUrl and searchPath in config
3. Test searchParams format
4. Check if website requires authentication

### Wrong Layout/Styling
1. Ensure component extends BaseBusinessScraper
2. Check that city-key prop matches config id
3. Verify no custom CSS is overriding styles

### Parsing Issues (Custom Cities)
1. Use browser DevTools to inspect HTML structure
2. Add console.log statements to parser
3. Test selectors in browser console
4. Check for dynamic content loading

## Migration from Old System

Existing cities have been updated to use this new system:
- ✅ **Wilmington**: Now uses BaseBusinessScraper with GrowthZone parsing
- ✅ **Dayton**: Now uses BaseBusinessScraper with GrowthZone parsing  
- ✅ **Huntington Beach**: Now uses BaseBusinessScraper with GrowthZone parsing
- ✅ **New York**: Now uses BaseBusinessScraper with custom parsing

All cities now have identical layout, styling, and behavior while maintaining their specific parsing logic.

## Future Enhancements

The systematized approach makes these future improvements easy:

1. **Global Styling Changes**: Update BaseBusinessScraper.vue
2. **New Data Fields**: Add to business object structure
3. **Enhanced Features**: Loading animations, favorites, etc.
4. **Mobile Improvements**: Responsive design changes
5. **Performance**: Caching, pagination, etc.

Changes to the base component automatically apply to all cities, ensuring consistency and reducing maintenance effort.

## **Special Case: Atlas/ChamberMaster Systems**

Some chambers use Atlas or ChamberMaster platforms, which have similar functionality to GrowthZone but different technical implementation.

### **Atlas System Indicators:**
- ✅ URLs containing `/atlas/directory/` or `/atlas/`
- ✅ Search pages like `*/atlas/directory/search`
- ✅ Similar card-based layouts to GrowthZone
- ✅ Often use standard web technologies (not .gz- classes)

**Common Example: Atlas/ChamberMaster Systems**
- URL pattern: Often includes `/atlas/` or `/directory/` in the path
- **Recommendation**: Start with GrowthZone approach, then switch to custom if needed

### **Investigation Process for Atlas Systems:**

1. **Try GrowthZone First**:
   ```bash
   node scripts/generate-city.js "YourCity" "yourcity" --type=growthzone
   ```

2. **Update Configuration**:
   ```javascript
   // In config.js, try this Atlas configuration:
   {
     id: 'yourcity',
     name: 'Your City',
     baseUrl: 'https://yourchamber.com',
     searchPath: '/atlas/directory/search',
     searchParams: (term) => `?q=${encodeURIComponent(term)}`,
     type: 'growthzone-list', // Try GrowthZone approach first
   }
   ```

3. **Test the Component**:
   - Add to App.vue and test with search terms like "restaurant" or "bank"
   - Check browser console for results

4. **If No Results**: Atlas systems often need custom parsing
   ```bash
   # Generate custom component instead
   node scripts/generate-city.js "YourCity" "yourcity" --type=custom
   ```

### **Atlas Debugging Steps:**
1. Visit the chamber's directory search page
2. Try a search (like "restaurant")
3. Open browser DevTools and inspect the results HTML
4. Look for business card containers and their CSS classes
5. Check search URL format and parameters

### **Common Atlas Patterns:**
- Search results often in `.member-card` or `.business-card` containers
- May use different parameter formats: `?keyword=term` or `?search=term`
- Business details might be in `<h4>`, `<h5>`, or custom classes

**Note**: Some Atlas/ChamberMaster systems use JavaScript-rendered content that cannot be scraped with our current static HTML approach. If you encounter a system that loads content dynamically, it may not be compatible with our scraper.
