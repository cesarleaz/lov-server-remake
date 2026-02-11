import express from 'express';
import { fetchWithTimeout } from '../utils/httpUtils.js';

const router = express.Router();

async function quickSslTest() {
  try {
    const response = await fetchWithTimeout('https://httpbin.org/get', { timeout: 5000 });
    return {
      ssl_working: response.ok,
      status_code: response.status,
      message: response.ok ? 'SSL configuration is working' : `Unexpected status: ${response.status}`
    };
  } catch (e) {
    return {
      ssl_working: false,
      error: 'CONNECTION_ERROR',
      message: `Connection failed: ${e.message}`
    };
  }
}

router.get('/test_ssl', async (req, res) => {
  res.json(await quickSslTest());
});

router.get('/test_ssl_full', async (req, res) => {
  const checks = [];
  const push = (test, success, message, details = {}) => checks.push({ test, success, message, details });

  try {
    const versions = process.versions;
    push('Node Environment', true, 'Node runtime available', { node: versions.node, openssl: versions.openssl });
  } catch (e) {
    push('Node Environment', false, e.message);
  }

  const quick = await quickSslTest();
  push('HTTPS Connectivity', quick.ssl_working, quick.message, quick);

  const overall = checks.every((c) => c.success);
  res.json({ overall_success: overall, tests: checks });
});

router.get('/ssl_status', (req, res) => {
  res.json({
    ssl_enabled: true,
    runtime: 'nodejs',
    openssl: process.versions.openssl,
    tls_default_min_version: 'TLSv1.2'
  });
});

export default router;
