require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { runPipeline } = require('./orchestrator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.options('*', cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// GET /health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// POST /api/blueprint
app.post('/api/blueprint', async (req, res) => {
  const { productIdea } = req.body;

  // Validate presence and type
  if (!productIdea || typeof productIdea !== 'string' || productIdea.trim() === '') {
    return res.status(400).json({
      error: 'productIdea is required and must be a non-empty string',
    });
  }

  // Validate length
  if (productIdea.length > 2000) {
    return res.status(400).json({
      error: 'productIdea must not exceed 2000 characters',
    });
  }

  try {
    const blueprint = await runPipeline(productIdea.trim());
    return res.status(200).json(blueprint);
  } catch (error) {
    console.error('[Server] Pipeline error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Blueprint AI server running on http://localhost:${PORT}`);
});