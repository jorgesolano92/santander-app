const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfills for Node.js modules in web environment
config.resolver.alias = {
  ...config.resolver.alias,
  events: 'events',
};

module.exports = config;