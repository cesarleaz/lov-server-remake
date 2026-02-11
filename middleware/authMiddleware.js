import { AuthError, parseBearerToken, verifyAccessToken } from '../services/authService.js';

function formatAuthError(error) {
  const status = error instanceof AuthError ? error.status : 401;
  const code = error instanceof AuthError ? error.code : 'AUTH_ERROR';
  const detail = error?.message || 'Unauthorized';

  return { status, payload: { detail, code } };
}

export function requireAuthorization(req, res, next) {
  try {
    const token = parseBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        detail: 'Authorization token missing',
        code: 'TOKEN_MISSING'
      });
    }

    const payload = verifyAccessToken(token);
    req.auth = {
      sessionId: payload.sid,
      userId: payload.sub,
      deviceId: payload.device_id,
      expiresAt: payload.exp
    };

    return next();
  } catch (error) {
    const formatted = formatAuthError(error);
    return res.status(formatted.status).json(formatted.payload);
  }
}
