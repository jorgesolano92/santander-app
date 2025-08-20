const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable source maps to avoid update issues
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Clear resolver cache
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;