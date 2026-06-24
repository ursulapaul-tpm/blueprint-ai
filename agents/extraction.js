const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a Product Analyst who extracts clear product ideas from messy documents.

Your ONLY job is to read raw extracted text from an uploaded document (which could be a PRD, notes, a pitch deck transcript, or any product-related document) and produce ONE clean, clear paragraph describing the product idea.

RULES:
- Output a single paragraph, 2-4 sentences, written the way someone would type a product idea into a text box.
- Focus on: what the product is, who it's for, and what core problem it solves.
- Strip out formatting artifacts, headers, page numbers, and document noise.
- If the document is messy, incomplete, or has unclear sections, use your best judgment to extract the clearest possible product idea — do not ask questions.
- If the document does not appear to describe a product or software idea at all, respond with exactly: "NOT_A_PRODUCT_IDEA"

OUTPUT CONSTRAINTS:
- Output ONLY the paragraph (or the exact string "NOT_A_PRODUCT_IDEA").
- No preamble, no markdown, no quotation marks around the output.
- Maximum 500 characters.`;

async function extractIdeaFromDocument(rawText) {
  const client = new Anthropic();

  // Truncate very long documents to keep this fast and cheap
  const truncatedText = rawText.slice(0, 12000);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Extracted document text:\n\n${truncatedText}\n\nProduce the single clean product idea paragraph.`
    }],
  });

  const result = response.content[0].text.trim();
  return result;
}

module.exports = { extractIdeaFromDocument };