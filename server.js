require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { runPipeline, applyArchitectureChoice } = require('./orchestrator');
const { parseDocument } = require('./utils/parseDocument');
const { extractIdeaFromDocument } = require('./agents/extraction');
const { saveBlueprint, getHistoryForDevice, deleteBlueprint, saveFeedback, getAllFeedback } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the first proxy hop (Render sits behind a reverse proxy) so req.ip
// reflects the real client IP, not Render's internal proxy address.
app.set('trust proxy', 1);

// Rate limiter — protects expensive blueprint generation endpoints from abuse.
// Each generation triggers 5 real Claude API calls, so this directly protects API spend.
const RATE_LIMIT_MESSAGE = 'You\'ve reached the limit of 5 blueprint generations per hour. Please try again later.';

const blueprintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 generations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: RATE_LIMIT_MESSAGE },
  keyGenerator: (req) => req.ip,
});

// Same limit, but for the SSE streaming endpoint — sends a properly formatted
// SSE event on rate-limit instead of a raw HTTP 429 (which EventSource can't parse).
const streamRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: RATE_LIMIT_MESSAGE })}\n\n`);
    res.end();
  },
});

// Multer config — temp storage for uploaded documents
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedExt = ['.pdf', '.docx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type. Only PDF, DOCX, TXT, and MD files are allowed.'));
  },
});

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
app.post('/api/blueprint', blueprintLimiter, async (req, res) => {
  const { productIdea, additionalContext } = req.body;

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

  if (additionalContext && typeof additionalContext === 'string' && additionalContext.length > 1000) {
    return res.status(400).json({
      error: 'additionalContext must not exceed 1000 characters',
    });
  }

  try {
    let finalIdea = productIdea.trim();
    if (additionalContext && additionalContext.trim()) {
      finalIdea = `${finalIdea}\n\nAdditional context: ${additionalContext.trim()}`;
    }
    const blueprint = await runPipeline(finalIdea);
    return res.status(200).json(blueprint);
  } catch (error) {
    console.error('[Server] Pipeline error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/blueprint-stream — same pipeline, but streams live progress via Server-Sent Events
app.get('/api/blueprint-stream', streamRateLimiter, async (req, res) => {
  const { productIdea, additionalContext } = req.query;

  if (!productIdea || typeof productIdea !== 'string' || productIdea.trim() === '') {
    return res.status(400).json({ error: 'productIdea is required and must be a non-empty string' });
  }
  if (productIdea.length > 2000) {
    return res.status(400).json({ error: 'productIdea must not exceed 2000 characters' });
  }
  if (additionalContext && typeof additionalContext === 'string' && additionalContext.length > 1000) {
    return res.status(400).json({ error: 'additionalContext must not exceed 1000 characters' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let finalIdea = productIdea.trim();
  if (additionalContext && additionalContext.trim()) {
    finalIdea = `${finalIdea}\n\nAdditional context: ${additionalContext.trim()}`;
  }

  // Keep the connection alive on platforms that buffer/timeout idle connections (e.g. Render)
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 15000);

  try {
    const blueprint = await runPipeline(finalIdea, (progress) => {
      send('progress', progress);
    });
    send('done', blueprint);
  } catch (error) {
    console.error('[Server] Stream pipeline error:', error.message);
    send('error', { error: error.message });
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
});

// POST /api/extract-document
app.post('/api/extract-document', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document file was provided.' });
  }

  const filePath = req.file.path;

  try {
    const rawText = await parseDocument(filePath, req.file.originalname);

    if (!rawText || rawText.trim().length < 20) {
      return res.status(400).json({
        error: 'Could not extract meaningful text from this document. It may be empty, scanned, or image-based.',
      });
    }

    const extractedIdea = await extractIdeaFromDocument(rawText);

    if (extractedIdea === 'NOT_A_PRODUCT_IDEA') {
      return res.status(400).json({
        error: 'This document does not appear to describe a product or software idea.',
      });
    }

    return res.status(200).json({ extractedIdea });
  } catch (error) {
    console.error('[Server] Document extraction error:', error.message);
    return res.status(500).json({ error: error.message });
  } finally {
    // Clean up the temp uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('[Server] Failed to delete temp file:', err.message);
    });
  }
});

// POST /api/history/save
app.post('/api/history/save', async (req, res) => {
  const { deviceId, idea, blueprint } = req.body;

  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
    return res.status(400).json({ error: 'deviceId is required and must be a non-empty string' });
  }
  if (!idea || typeof idea !== 'string') {
    return res.status(400).json({ error: 'idea is required and must be a string' });
  }
  if (!blueprint || typeof blueprint !== 'object') {
    return res.status(400).json({ error: 'blueprint is required and must be an object' });
  }

  try {
    const id = await saveBlueprint(deviceId.trim(), idea, blueprint);
    return res.status(200).json({ id });
  } catch (error) {
    console.error('[Server] History save error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/history/:deviceId
app.get('/api/history/:deviceId', async (req, res) => {
  const { deviceId } = req.params;

  if (!deviceId || deviceId.trim() === '') {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  try {
    const history = await getHistoryForDevice(deviceId.trim());
    return res.status(200).json({ history });
  } catch (error) {
    console.error('[Server] History fetch error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/history/:id
app.delete('/api/history/:id', async (req, res) => {
  const { id } = req.params;
  const { deviceId } = req.body;

  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
    return res.status(400).json({ error: 'deviceId is required in the request body' });
  }

  try {
    const deleted = await deleteBlueprint(Number(id), deviceId.trim());
    if (!deleted) {
      return res.status(404).json({ error: 'Blueprint not found or does not belong to this device' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Server] History delete error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/feedback
app.post('/api/feedback', async (req, res) => {
  const { deviceId, rating, message, pageContext, role } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'message is required and must be a non-empty string' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'message must not exceed 2000 characters' });
  }
  if (rating !== undefined && rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return res.status(400).json({ error: 'rating must be a number between 1 and 5' });
  }
  if (role !== undefined && role !== null && typeof role !== 'string') {
    return res.status(400).json({ error: 'role must be a string' });
  }

  try {
    const id = await saveFeedback(deviceId, rating, message.trim(), pageContext, role);
    return res.status(200).json({ id, success: true });
  } catch (error) {
    console.error('[Server] Feedback save error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/feedback — password-protected, returns all feedback
app.post('/api/admin/feedback', async (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Admin access is not configured on the server.' });
  }
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  try {
    const feedback = await getAllFeedback();
    return res.status(200).json({ feedback });
  } catch (error) {
    console.error('[Server] Admin feedback fetch error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Multer error handler (file too large, wrong type, etc.)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// POST /api/apply-architecture-choice
app.post('/api/apply-architecture-choice', async (req, res) => {
  const { blueprint, constraint } = req.body;

  if (!blueprint || typeof blueprint !== 'object') {
    return res.status(400).json({
      error: 'blueprint is required and must be an object',
    });
  }

  if (!constraint || typeof constraint !== 'string' || constraint.trim() === '') {
    return res.status(400).json({
      error: 'constraint is required and must be a non-empty string',
    });
  }

  try {
    const updatedBlueprint = await applyArchitectureChoice(blueprint, constraint.trim());
    return res.status(200).json(updatedBlueprint);
  } catch (error) {
    console.error('[Server] Apply architecture choice error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Blueprint AI server running on http://localhost:${PORT}`);
});