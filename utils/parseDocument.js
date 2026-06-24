const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

// Extracts raw text from a file based on its extension
async function parseDocument(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (ext === '.txt' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

module.exports = { parseDocument };