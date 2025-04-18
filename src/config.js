// Configuration for different environments

const config = {
  // In development mode (local), use the proxy defined in vite.config.js
  apiBaseUrls: {
    wilmington: import.meta.env.PROD 
      ? 'https://cors-anywhere.herokuapp.com/https://www.wilmingtonchamber.org' 
      : '/api/wilmington',
    dayton: import.meta.env.PROD 
      ? 'https://cors-anywhere.herokuapp.com/https://daytonareachamberofcommerce.growthzoneapp.com' 
      : '/api/dayton'
  }
};

export default config;