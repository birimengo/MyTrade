
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo', // for Expo managed workflow
      // OR
      // 'module:metro-react-native-babel-preset' // for bare React Native
    ],
    plugins: [
      'react-native-reanimated/plugin', // if using Reanimated
    ],
  };
};
