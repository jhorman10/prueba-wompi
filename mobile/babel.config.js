module.exports = {
  presets: [
    [
      'module:@react-native/babel-preset',
      {
        enableBabelRuntime: require('@babel/runtime/package.json').version,
      },
    ],
  ],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        allowUndefined: true,
      },
    ],
  ],
};
