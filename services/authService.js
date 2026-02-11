import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { DeviceSession } from '../models/deviceSessionSchema.js';

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS || 60 * 15);
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 30);
const DEVICE_CODE_TTL_SECONDS = Number(process.env.AUTH_DEVICE_CODE_TTL_SECONDS || 60 * 10);
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'localmanus-device-auth-secret';

export class AuthError extends Error {
  constructor(message, { status = 401, code = 'AUTH_ERROR' } = {}) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function decodeBase64Url(value) {
  const withPadding = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = withPadding.padEnd(withPadding.length + ((4 - withPadding.length % 4) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signSegment(data) {
  return encodeBase64Url(
    crypto
      .createHmac('sha256', AUTH_TOKEN_SECRET)
      .update(data)
      .digest()
  );
}

function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signSegment(signingInput);
  return `${signingInput}.${signature}`;
}

function verifySignedToken(token) {
  if (!token || typeof token !== 'string') {
    throw new AuthError('Missing token', { status: 401, code: 'TOKEN_MISSING' });
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AuthError('Malformed token', { status: 401, code: 'TOKEN_MALFORMED' });
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signSegment(signingInput);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new AuthError('Invalid token signature', { status: 401, code: 'TOKEN_INVALID_SIGNATURE' });
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload));

  if (!payload.exp || Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
    throw new AuthError('Token expired', { status: 401, code: 'TOKEN_EXPIRED' });
  }

  return payload;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateDeviceCode() {
  return crypto.randomInt(100000, 999999).toString();
}

export async function createPendingDeviceSession({ deviceId, metadata = {}, ttlSeconds = DEVICE_CODE_TTL_SECONDS } = {}) {
  if (!deviceId) {
    throw new AuthError('device_id is required', { status: 400, code: 'DEVICE_ID_REQUIRED' });
  }

  const now = new Date();
  const codeExpiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  let code = generateDeviceCode();
  for (let attempts = 0; attempts < 5; attempts += 1) {
    const existing = await DeviceSession.findOne({ code, status: 'pending', code_expires_at: { $gt: now } }).lean();
    if (!existing) break;
    code = generateDeviceCode();
  }

  const session = await DeviceSession.create({
    _id: nanoid(),
    device_id: deviceId,
    metadata,
    code,
    status: 'pending',
    code_expires_at: codeExpiresAt,
    expires_at: codeExpiresAt
  });

  return session.toObject();
}

function buildTokenPair(session, { userId }) {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const accessExp = issuedAtSeconds + ACCESS_TOKEN_TTL_SECONDS;
  const refreshExp = issuedAtSeconds + REFRESH_TOKEN_TTL_SECONDS;
  const refreshJti = nanoid();

  const accessToken = signToken({
    typ: 'access',
    sid: session._id,
    sub: userId,
    device_id: session.device_id,
    iat: issuedAtSeconds,
    exp: accessExp
  });

  const refreshToken = signToken({
    typ: 'refresh',
    sid: session._id,
    jti: refreshJti,
    sub: userId,
    device_id: session.device_id,
    iat: issuedAtSeconds,
    exp: refreshExp
  });

  return {
    accessToken,
    refreshToken,
    refreshJti,
    accessExp: new Date(accessExp * 1000),
    refreshExp: new Date(refreshExp * 1000)
  };
}

export async function authorizeDeviceCode({ code, userId }) {
  if (!code) throw new AuthError('code is required', { status: 400, code: 'DEVICE_CODE_REQUIRED' });
  if (!userId) throw new AuthError('user_id is required', { status: 400, code: 'USER_ID_REQUIRED' });

  const now = new Date();
  const session = await DeviceSession.findOne({ code });

  if (!session) {
    throw new AuthError('Device code not found', { status: 404, code: 'DEVICE_CODE_NOT_FOUND' });
  }

  if (session.status !== 'pending') {
    throw new AuthError('Device code is not pending', { status: 409, code: 'DEVICE_CODE_NOT_PENDING' });
  }

  if (!session.code_expires_at || session.code_expires_at <= now) {
    session.status = 'expired';
    await session.save();
    throw new AuthError('Device code expired', { status: 401, code: 'DEVICE_CODE_EXPIRED' });
  }

  const tokenPair = buildTokenPair(session, { userId });

  session.user_id = userId;
  session.status = 'authorized';
  session.session_token = tokenPair.accessToken;
  session.expires_at = tokenPair.refreshExp;
  session.refresh_token_jti = tokenPair.refreshJti;
  session.refresh_token_hash = hashToken(tokenPair.refreshToken);
  session.refresh_token_expires_at = tokenPair.refreshExp;
  session.authorized_at = now;
  await session.save();

  return {
    status: session.status,
    session_id: session._id,
    code: session.code,
    user_id: session.user_id,
    access_token: tokenPair.accessToken,
    refresh_token: tokenPair.refreshToken,
    expires_at: tokenPair.accessExp,
    refresh_expires_at: tokenPair.refreshExp
  };
}

export async function pollDeviceCode(code) {
  if (!code) throw new AuthError('code is required', { status: 400, code: 'DEVICE_CODE_REQUIRED' });

  const now = new Date();
  const session = await DeviceSession.findOne({ code }).lean();

  if (!session) {
    throw new AuthError('Device code not found', { status: 404, code: 'DEVICE_CODE_NOT_FOUND' });
  }

  if (session.status === 'pending' && (!session.code_expires_at || session.code_expires_at <= now)) {
    await DeviceSession.updateOne({ _id: session._id }, { $set: { status: 'expired' } });
    return {
      status: 'expired',
      session_id: session._id,
      expires_at: session.code_expires_at
    };
  }

  if (session.status !== 'authorized') {
    return {
      status: session.status,
      session_id: session._id,
      expires_at: session.code_expires_at
    };
  }

  return {
    status: session.status,
    session_id: session._id,
    user_id: session.user_id,
    access_token: session.session_token,
    expires_at: session.expires_at,
    refresh_token_available: Boolean(session.refresh_token_hash)
  };
}

export function verifyAccessToken(token) {
  const payload = verifySignedToken(token);

  if (payload.typ !== 'access') {
    throw new AuthError('Invalid access token type', { status: 401, code: 'TOKEN_INVALID_TYPE' });
  }

  return payload;
}

async function verifyRefreshTokenAgainstSession(token) {
  const payload = verifySignedToken(token);

  if (payload.typ !== 'refresh') {
    throw new AuthError('Invalid refresh token type', { status: 401, code: 'TOKEN_INVALID_TYPE' });
  }

  const session = await DeviceSession.findById(payload.sid);
  if (!session) {
    throw new AuthError('Session not found', { status: 404, code: 'SESSION_NOT_FOUND' });
  }

  if (session.status !== 'authorized') {
    throw new AuthError('Session is not authorized', { status: 401, code: 'SESSION_NOT_AUTHORIZED' });
  }

  if (session.revoked_at) {
    throw new AuthError('Session revoked', { status: 401, code: 'SESSION_REVOKED' });
  }

  if (session.refresh_token_jti !== payload.jti || session.refresh_token_hash !== hashToken(token)) {
    throw new AuthError('Refresh token invalid', { status: 401, code: 'REFRESH_TOKEN_INVALID' });
  }

  if (!session.refresh_token_expires_at || session.refresh_token_expires_at <= new Date()) {
    throw new AuthError('Refresh token expired', { status: 401, code: 'TOKEN_EXPIRED' });
  }

  return { payload, session };
}

export async function refreshDeviceToken(refreshToken) {
  if (!refreshToken) {
    throw new AuthError('refresh_token is required', { status: 400, code: 'REFRESH_TOKEN_REQUIRED' });
  }

  const { payload, session } = await verifyRefreshTokenAgainstSession(refreshToken);
  const tokenPair = buildTokenPair(session, { userId: payload.sub });

  session.session_token = tokenPair.accessToken;
  session.refresh_token_jti = tokenPair.refreshJti;
  session.refresh_token_hash = hashToken(tokenPair.refreshToken);
  session.refresh_token_expires_at = tokenPair.refreshExp;
  session.expires_at = tokenPair.refreshExp;
  await session.save();

  return {
    access_token: tokenPair.accessToken,
    refresh_token: tokenPair.refreshToken,
    expires_at: tokenPair.accessExp,
    refresh_expires_at: tokenPair.refreshExp
  };
}

export async function invalidateSession({ sessionId, refreshToken } = {}) {
  let resolvedSessionId = sessionId;

  if (!resolvedSessionId && refreshToken) {
    const { payload } = await verifyRefreshTokenAgainstSession(refreshToken);
    resolvedSessionId = payload.sid;
  }

  if (!resolvedSessionId) {
    throw new AuthError('session identifier is required', { status: 400, code: 'SESSION_ID_REQUIRED' });
  }

  const session = await DeviceSession.findById(resolvedSessionId);
  if (!session) {
    throw new AuthError('Session not found', { status: 404, code: 'SESSION_NOT_FOUND' });
  }

  session.status = 'revoked';
  session.revoked_at = new Date();
  session.session_token = null;
  session.refresh_token_hash = null;
  session.refresh_token_jti = null;
  session.refresh_token_expires_at = null;
  await session.save();

  return { success: true };
}

export function parseBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
