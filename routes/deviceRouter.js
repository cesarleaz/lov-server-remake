import express from 'express';
import {
  AuthError,
  authorizeDeviceCode,
  createPendingDeviceSession,
  invalidateSession,
  parseBearerToken,
  pollDeviceCode,
  refreshAccessTokenFromAccessToken,
  verifyAccessToken
} from '../services/authService.js';
import { z, validateBody, validateQuery } from '../utils/validation.js';

const router = express.Router();

const authBodySchema = z.object({
  device_id: z.string().min(1).optional().default('unknown-device'),
  metadata: z.record(z.any()).optional().default({})
});

const pollQuerySchema = z.object({
  code: z.string().min(1)
});

function sendAuthError(res, error) {
  if (error instanceof AuthError) {
    return res.status(error.status || 401).json({
      status: 'error',
      message: error.message,
      code: error.code || 'AUTH_ERROR'
    });
  }

  return res.status(500).json({
    status: 'error',
    message: error?.message || 'Authentication service error',
    code: 'INTERNAL_ERROR'
  });
}

router.post('/device/auth', validateBody(authBodySchema), async (req, res) => {
  try {
    const session = await createPendingDeviceSession({
      deviceId: req.body.device_id,
      metadata: req.body.metadata
    });

    return res.status(200).json({
      status: 'pending',
      code: session.code,
      expires_at: session.code_expires_at
    });
  } catch (error) {
    return sendAuthError(res, error);
  }
});

router.get('/device/poll', validateQuery(pollQuerySchema), async (req, res) => {
  try {
    let pollResult = await pollDeviceCode(req.query.code);

    // Internal backend flow: auto-authorize local user after first poll.
    if (pollResult.status === 'pending') {
      await authorizeDeviceCode({
        code: req.query.code,
        userId: 'local-user'
      });
      pollResult = await pollDeviceCode(req.query.code);
    }

    if (pollResult.status === 'authorized') {
      return res.status(200).json({
        status: 'authorized',
        token: pollResult.access_token,
        user_info: {
          id: pollResult.user_id,
          username: pollResult.user_id,
          image_url: ''
        }
      });
    }

    if (pollResult.status === 'expired') {
      return res.status(200).json({ status: 'expired' });
    }

    if (pollResult.status === 'revoked') {
      return res.status(200).json({ status: 'error', message: 'Session revoked' });
    }

    return res.status(200).json({ status: 'pending' });
  } catch (error) {
    return sendAuthError(res, error);
  }
});

router.get('/device/refresh-token', async (req, res) => {
  try {
    const accessToken = parseBearerToken(req.headers.authorization);

    if (!accessToken) {
      return res.status(401).json({ detail: 'Authorization token missing', code: 'TOKEN_MISSING' });
    }

    const tokenPair = await refreshAccessTokenFromAccessToken(accessToken);
    return res.status(200).json({ new_token: tokenPair.access_token });
  } catch (error) {
    if (error instanceof AuthError && error.code === 'TOKEN_EXPIRED') {
      return res.status(401).json({ detail: error.message, code: error.code });
    }

    return sendAuthError(res, error);
  }
});

router.post('/device/logout', async (req, res) => {
  try {
    const accessToken = parseBearerToken(req.headers.authorization);

    if (!accessToken) {
      return res.status(401).json({ detail: 'Authorization token missing', code: 'TOKEN_MISSING' });
    }

    const payload = verifyAccessToken(accessToken);
    await invalidateSession({ sessionId: payload.sid });
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof AuthError && error.code === 'SESSION_NOT_FOUND') {
      return res.status(200).json({ success: true });
    }

    return sendAuthError(res, error);
  }
});

export default router;
