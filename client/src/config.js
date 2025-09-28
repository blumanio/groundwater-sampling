const config = {
  development: {
    API_URL: 'http://localhost:5000/api'
  },
  production: {
    API_URL: '/api'
  }
};

const environment = process.env.NODE_ENV || 'development';

export default config[environment];