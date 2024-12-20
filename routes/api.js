'use strict';

const axios = require('axios');

// In-memory storage for likes
const likesDatabase = {};

// Function to anonymize IP addresses
const anonymizeIP = (ip) => {
    return ip.split('.').slice(0, 3).join('.') + '.0';
};

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        const { stock, like } = req.query;

        if (!stock) {
          return res.status(400).json({ error: 'Stock symbol is required' });
        }

        const stocks = Array.isArray(stock) ? stock : [stock.toUpperCase()];
        const responses = await Promise.all(stocks.map(async (symbol) => {
          const apiUrl = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
          const stockResponse = await axios.get(apiUrl);

          if (!stockResponse.data || !stockResponse.data.symbol) {
            throw new Error(`Stock data for symbol ${symbol} not found`);
          }

          const stockData = {
            stock: stockResponse.data.symbol,
            price: parseFloat(stockResponse.data.latestPrice),
            likes: 0
          };

          if (like === 'true') {
            const userIP = anonymizeIP(req.ip);
            likesDatabase[stockData.stock] = likesDatabase[stockData.stock] || new Set();
            likesDatabase[stockData.stock].add(userIP);
          }

          stockData.likes = likesDatabase[stockData.stock] ? likesDatabase[stockData.stock].size : 0;
          return stockData;
        }));

        if (stocks.length === 2) {
          const rel_likes = responses[0].likes - responses[1].likes;
          responses[0].rel_likes = rel_likes;
          responses[1].rel_likes = -rel_likes;
        }

        res.json({ stockData: stocks.length === 1 ? responses[0] : responses });
      } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Unable to fetch stock data' });
      }
    });
};
