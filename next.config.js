module.exports = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/generate-text',
        destination: 'https://api.openai.com/v1/chat/completions'
      }
    ];
  }
}