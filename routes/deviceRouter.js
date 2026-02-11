import express from 'express';
import { z, validateBody, validateParams } from '../utils/validation.js';
import {
  AuthError,
  authorizeDeviceCode,
  createPendingDeviceSession,
  invalidateSession,
  parseBearerToken,
  pollDeviceCode,
  refreshDeviceToken,
  verifyAccessToken
} from '../services/authService.js';
import { requireAuthorization } from '../middleware/authMiddleware.js';

const router = express.Router();

const createCodeBodySchema = z.object({
  device_id: z.string().min(1),
  metadata: z.any().optional().default({})
});

const authorizeCodeBodySchema = z.object({
  code: z.string().min(1),
  user_id: z.string().min(1)
});

const codeParamSchema = z.object({
  code: z.string().min(1)
});

const refreshTokenBodySchema = z.object({
  refresh_token: z.string().min(1)
});

const logoutBodySchema = z.object({
  refresh_token: z.string().optional(),
  session_id: z.string().optional()
});

function sendAuthError(res, error) {
  if (error instanceof AuthError) {
    return res.status(error.status).json({ detail: error.message, code: error.code });
  }

  console.error('Device auth error:', error);
  return res.status(500).json({ detail: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
}

router.post('/device/code', validateBody(createCodeBodySchema), async (req, res) => {
  try {
    const session = await createPendingDeviceSession(req.body);
    return res.json({
      session_id: session._id,
      code: session.code,
      status: session.status,
      expires_at: session.code_expires_at
    });
  } catch (error) {
    return sendAuthError(res, error);
  }
});

router.post('/device/authorize', validateBody(authorizeCodeBodySchema), async (req, res) => {
  try {
    const payload = await authorizeDeviceCode({
      code: req.body.code,
      userId: req.body.user_id
    });
    return res.json(payload);
  } catch (error) {
    return sendAuthError(res, error);
  }
});

router.get('/device/poll/:code', validateParams(codeParamSchema), async (req, res) => {
  try {
    const payload = await pollDeviceCode(req.params.code);
    return res.json(payload);
  } catch (error) {
    return sendAuthError(res, error);
  }
});

router.post('/device/refresh-token', validateBody(refreshTokenBodySchema), async (req, res) => {
  try {
    const payload = await refreshDeviceToken(req.body.refresh_token);
    return res.json(payload);
  } catch (error) {
    return sendAuthError(res, error);
  }
});

router.post('/device/logout', validateBody(logoutBodySchema), async (req, res) => {
  try {
    const headerToken = parseBearerToken(req.headers.authorization);
    let sessionId = req.body.session_id || null;

    if (!sessionId && headerToken) {
      try {
        sessionId = verifyAccessToken(headerToken).sid;
      } catch {
        sessionId = null;
      }
    }

    await invalidateSession({
      sessionId,
      refreshToken: req.body.refresh_token
    });

    return res.json({ success: true });
  } catch (error) {
    return sendAuthError(res, error);
  }
});

router.get('/device/me', requireAuthorization, (req, res) => {
  return res.json({
    user_id: req.auth.userId,
    session_id: req.auth.sessionId,
    device_id: req.auth.deviceId,
    expires_at: req.auth.expiresAt
  });
});

export default router;
