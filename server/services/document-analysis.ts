import { generateCustomAIResponse } from "./custom-ai";

// Supported file types for document analysis
export const SUPPORTED_FILE_TYPES = {
  'text/plain': 'txt',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/csv': 'csv',
  'application/json': 'json',
  'text/markdown': 'md'
};

// Extract text content from different file types
export async function extractTextFromFile(fileBuffer: Buffer, mimeType: string, filename: string): Promise<string> {
  try {
    switch (mimeType) {
      case 'text/plain':
      case 'text/csv':
      case 'application/json':
      case 'text/markdown':
        return fileBuffer.toString('utf-8');
      
      case 'application/pdf':
        // For PDF, we'll need to use a library like pdf-parse
        // For now, return placeholder that indicates PDF processing needed
        return `[PDF Document: ${filename}]\nPDF text extraction requires additional setup. Please convert to text format for analysis.`;
      
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // For Word docs, similar placeholder
        return `[Word Document: ${filename}]\nWord document text extraction requires additional setup. Please convert to text format for analysis.`;
      
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    throw new Error(`Failed to extract text from file: ${error.message}`);
  }
}

// Analyze document content with AI
export async function analyzeDocument(
  fileContent: string, 
  filename: string, 
  analysisType: string = 'general',
  conversationHistory: Array<{role: string, content: string}> = []
): Promise<string> {
  
  // Create analysis prompt based on type
  let analysisPrompt = '';
  
  switch (analysisType) {
    case 'summary':
      analysisPrompt = `Please provide a clear summary of this document "${filename}". Focus on key points and main ideas.`;
      break;
    case 'questions':
      analysisPrompt = `Analyze this document "${filename}" and generate 5 important questions that could be answered based on its content.`;
      break;
    case 'insights':
      analysisPrompt = `Analyze this document "${filename}" and provide key insights, patterns, or important findings.`;
      break;
    case 'extract':
      analysisPrompt = `Extract the most important information from this document "${filename}". Organize it in a clear, structured way.`;
      break;
    default:
      analysisPrompt = `Analyze this document "${filename}". Provide a helpful overview of its content and key points.`;
  }
  
  // Truncate content if too long (keep first 3000 characters)
  const truncatedContent = fileContent.length > 3000 
    ? fileContent.substring(0, 3000) + '\n\n[Content truncated for analysis...]'
    : fileContent;
  
  const fullPrompt = `${analysisPrompt}

Document Content:
${truncatedContent}`;

  try {
    return await generateCustomAIResponse(fullPrompt, conversationHistory);
  } catch (error) {
    throw new Error(`Document analysis failed: ${error.message}`);
  }
}

// Validate file for upload
export function validateFile(fileSize: number, mimeType: string): { valid: boolean; error?: string } {
  // Check file size (limit to 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileSize > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }
  
  // Check file type
  if (!SUPPORTED_FILE_TYPES[mimeType]) {
    const supportedTypes = Object.values(SUPPORTED_FILE_TYPES).join(', ');
    return { valid: false, error: `Unsupported file type. Supported types: ${supportedTypes}` };
  }
  
  return { valid: true };
}

// Get analysis options for frontend
export function getAnalysisOptions() {
  return [
    { value: 'general', label: 'General Analysis', description: 'Overall document overview and key points' },
    { value: 'summary', label: 'Summary', description: 'Concise summary of main ideas' },
    { value: 'questions', label: 'Generate Questions', description: 'Create questions based on content' },
    { value: 'insights', label: 'Key Insights', description: 'Extract patterns and important findings' },
    { value: 'extract', label: 'Extract Information', description: 'Organize key information clearly' }
  ];
}