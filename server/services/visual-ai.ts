// Visual AI service for camera-based image analysis
// Analyzes images from camera feed in real-time

import { generateVisionResponse } from './multi-ai.js';

export interface VisualAnalysis {
  description: string;
  objects: string[];
  text?: string;
  colors: string[];
  scene: string;
  confidence: number;
  suggestions?: string[];
}

export async function analyzeImage(imageData: string, userQuery?: string): Promise<VisualAnalysis> {
  try {
    const dataUrl = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;

    const prompt = userQuery 
      ? `Look at this image and answer simply and directly: ${userQuery}

Keep your answer short - 1-3 sentences max. Be clear and conversational. If there's text visible, read it out. No bullet points or lists.`
      : `What's in this image? Give a simple, clear answer in 1-3 sentences. If there's text, read it. Be direct.`;

    const text = await generateVisionResponse(prompt, dataUrl, []);
    
    // Parse response into structured format
    const analysis: VisualAnalysis = {
      description: text,
      objects: extractObjects(text),
      text: extractText(text),
      colors: extractColors(text),
      scene: extractScene(text),
      confidence: 0.9,
      suggestions: extractSuggestions(text)
    };

    return analysis;
  } catch (error) {
    console.error('Visual AI analysis error:', error);
    throw new Error('Failed to analyze image. Please ensure your camera is working and try again.');
  }
}

export async function analyzeImageStream(imageData: string, context: string[]): Promise<string> {
  try {
    const dataUrl = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;

    const contextText = context.length > 0 
      ? `Previous conversation context: ${context.join('. ')}\n\n`
      : '';
    
    const prompt = `${contextText}I'm looking at this image through my camera. Tell me what you see and provide helpful insights. Be conversational and friendly. If I've asked about something specific in our conversation, focus on that.`;

    return await generateVisionResponse(prompt, dataUrl, []);
  } catch (error) {
    console.error('Visual AI stream analysis error:', error);
    return 'I\'m having trouble analyzing the image right now. Please ensure your camera is working and try again.';
  }
}

function extractObjects(text: string): string[] {
  const objects: string[] = [];
  
  // Look for common object patterns
  const objectPatterns = [
    /(?:I see|visible|there (?:is|are)|showing|contains?)\s+(?:a|an|the|some|several|many)?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/gi,
    /objects?:\s*(.+)/gi,
    /items?:\s*(.+)/gi
  ];
  
  objectPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const extracted = match.replace(/^(?:I see|visible|there (?:is|are)|showing|contains?|objects?:|items?:)\s*/i, '').trim();
        if (extracted && extracted.length > 1) {
          objects.push(extracted);
        }
      });
    }
  });
  
  return [...new Set(objects)].slice(0, 10);
}

function extractText(text: string): string | undefined {
  const textMatches = text.match(/(?:text|words?|reading|says?):\s*(.+)/gi);
  if (textMatches && textMatches.length > 0) {
    return textMatches[0].replace(/^(?:text|words?|reading|says?):\s*/i, '').trim();
  }
  return undefined;
}

function extractColors(text: string): string[] {
  const colorWords = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey', 'silver', 'gold'];
  const colors: string[] = [];
  
  colorWords.forEach(color => {
    if (text.toLowerCase().includes(color)) {
      colors.push(color);
    }
  });
  
  return [...new Set(colors)];
}

function extractScene(text: string): string {
  const sceneKeywords = {
    'indoor': ['room', 'inside', 'indoor', 'kitchen', 'bedroom', 'office', 'house', 'building'],
    'outdoor': ['outside', 'outdoor', 'park', 'street', 'garden', 'nature', 'sky', 'tree'],
    'vehicle': ['car', 'bus', 'train', 'airplane', 'vehicle', 'transportation'],
    'food': ['food', 'meal', 'restaurant', 'kitchen', 'cooking', 'eating'],
    'technology': ['computer', 'phone', 'screen', 'device', 'technology', 'electronic'],
    'people': ['person', 'people', 'face', 'human', 'group', 'crowd']
  };
  
  const lowerText = text.toLowerCase();
  for (const [scene, keywords] of Object.entries(sceneKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return scene;
    }
  }
  
  return 'general';
}

function extractSuggestions(text: string): string[] {
  const suggestions: string[] = [];
  
  // Look for suggestion patterns
  const suggestionPatterns = [
    /(?:suggest|recommend|try|consider|might want to|could):\s*(.+)/gi,
    /(?:suggestion|recommendation):\s*(.+)/gi
  ];
  
  suggestionPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const suggestion = match.replace(/^(?:suggest|recommend|try|consider|might want to|could|suggestion|recommendation):\s*/i, '').trim();
        if (suggestion && suggestion.length > 5) {
          suggestions.push(suggestion);
        }
      });
    }
  });
  
  return suggestions.slice(0, 3);
}

export function validateImageData(imageData: string): boolean {
  // Check if it's a valid base64 image
  const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
  return base64Pattern.test(imageData);
}

export function optimizeImageForAI(imageData: string): string {
  // For now, return as-is. Could add compression logic here
  return imageData;
}