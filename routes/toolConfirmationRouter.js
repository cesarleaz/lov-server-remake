import express from 'express';
import { sendToWebsocket } from '../services/websocketService.js';
import { confirmTool, cancelConfirmation } from '../services/toolConfirmationService.js';
import { z, validateBody } from '../utils/validation.js';

const router = express.Router();

const bodySchema = z.object({
  session_id: z.string().min(1),
  tool_call_id: z.string().min(1),
  confirmed: z.boolean()
});

router.post('/tool_confirmation', validateBody(bodySchema), async (req, res) => {
  try {
    const { session_id, tool_call_id, confirmed } = req.body;

    if (confirmed) {
      const success = confirmTool(tool_call_id);
      if (!success) {
        return res.status(404).json({ detail: 'Tool call not found or already processed' });
      }
      await sendToWebsocket(session_id, { type: 'tool_call_confirmed', id: tool_call_id });
    } else {
      const success = cancelConfirmation(tool_call_id);
      if (!success) {
        return res.status(404).json({ detail: 'Tool call not found or already processed' });
      }
      await sendToWebsocket(session_id, { type: 'tool_call_cancelled', id: tool_call_id });
    }

    return res.json({ status: 'success' });
  } catch (e) {
    return res.status(500).json({ detail: e.message });
  }
});

export default router;
