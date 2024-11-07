import { openaiRequest } from '../src/openairequest.js';

export async function summarizeText(transcriptText) {
  try {
    const summary = await openaiRequest(transcriptText);
    return summary;
  } catch (error) {
    console.error('Error in OpenAI summarization:', error);
    throw error;
  }
}