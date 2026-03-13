// Dynamic Expo config to read from environment variables
const appJson = require('./app.json');

module.exports = () => {
  return {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      openaiApiKey: process.env.OPENAI_API_KEY || '',
    },
  };
};
