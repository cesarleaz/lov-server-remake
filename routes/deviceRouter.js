import express from 'express';
import { nanoid } from 'nanoid';
import { DeviceSession } from '../models/deviceSessionSchema.js';
import { z, validateBody, validateQuery } from '../utils/validation.js';

const router = express.Router();

const authBodySchema = z.object({
  device_id: z.string().min(1).optional().default('unknown-device'),
  user_id: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional().default({})
});

const pollQuerySchema = z.object({
  code: z.string().min(1)
});

const refreshQuerySchema = z.object({
  code: z.string().min(1).optional()
});

function hasExpired(session) {
  return session.expires_at && new Date(session.expires_at).getTime() <= Date.now();
}

router.post('/device/auth', validateBody(authBodySchema), async (req, res) => {
  try {
    const code = nanoid(12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await DeviceSession.create({
      _id: code,
      device_id: req.body.device_id,
      user_id: req.body.user_id ?? null,
      session_token: req.body.user_id ? nanoid(32) : null,
      expires_at: expiresAt,
      metadata: req.body.metadata
    });

    return res.status(200).json({
      status: 'pending',
      code,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      detail: error.message || 'Failed to create device auth session'
    });
  }
});

router.get('/device/poll', validateQuery(pollQuerySchema), async (req, res) => {
  try {
    const session = await DeviceSession.findById(req.query.code).lean();

    if (!session) {
      return res.status(404).json({ status: 'error', detail: 'Invalid code' });
    }

    if (hasExpired(session)) {
      return res.status(200).json({ status: 'expired' });
    }

    if (session.session_token) {
      return res.status(200).json({
        status: 'authorized',
        token: session.session_token,
        user_info: session.metadata?.user_info ?? {
          user_id: session.user_id,
          device_id: session.device_id
        }
      });
    }

    return res.status(200).json({ status: 'pending' });
  } catch (error) {
    return res.status(500).json({ status: 'error', detail: error.message || 'Failed to poll device status' });
  }
});

router.get('/device/refresh-token', validateQuery(refreshQuerySchema), async (req, res) => {
  try {
    if (!req.query.code) {
      return res.status(400).json({ detail: 'code query param is required' });
    }

    const session = await DeviceSession.findById(req.query.code);

    if (!session) {
      return res.status(404).json({ detail: 'Device session not found' });
    }

    if (hasExpired(session)) {
      return res.status(410).json({ detail: 'Device session expired' });
    }

    session.session_token = nanoid(32);
    await session.save();

    return res.status(200).json({ new_token: session.session_token });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to refresh token' });
  }
});

export default router;
