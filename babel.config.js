module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // ⚠️ các plugin khác (nếu có) thì để ở trên
    'react-native-reanimated/plugin', // <— phải là DÒNG CUỐI CÙNG
  ],
};
