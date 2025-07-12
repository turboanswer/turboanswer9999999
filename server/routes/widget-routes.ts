// Widget API Routes
import { Router } from 'express';
import { widgetService } from '../services/widget-integration';

const router = Router();

// Create widget session
router.post('/api/widget/session', async (req, res) => {
  try {
    const sessionId = widgetService.generateSessionId();
    res.json({ sessionId });
  } catch (error) {
    console.error('Widget session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Process widget message
router.post('/api/widget/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }
    
    const response = await widgetService.processMessage(sessionId, message);
    res.json({ response });
  } catch (error) {
    console.error('Widget message error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

export default router;