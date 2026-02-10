const path = require('path');
const rootNodeModules = path.resolve(__dirname, '../../node_modules');

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts'],
  dependencies: {
    '@react-native-voice/voice': {
      root: path.join(rootNodeModules, '@react-native-voice/voice'),
    },
  },
};
