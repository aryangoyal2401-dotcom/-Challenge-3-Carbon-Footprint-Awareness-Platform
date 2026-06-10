/**
 * EcoTrack — API Integration Test Suite
 * Powered by Jest
 */

const http = require('http');
const app = require('../server'); // Import Express app

let server;
const PORT = 5001; // Use port 5001 for test isolation
const BASE = `http://localhost:${PORT}/api`;
let authToken = null;
const TEST_EMAIL = `test_${Date.now()}@ecotrack.com`;
const TEST_PASSWORD = 'TestPass123';

beforeAll((done) => {
  server = app.listen(PORT, () => {
    done();
  });
});

afterAll((done) => {
  server.close(() => {
    done();
  });
});

// Helper request function
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-test-bypass': 'ecotrack-test-suite-secret'
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Programmatic captcha solver helper
async function getSolvedCaptcha() {
  const res = await request('GET', '/auth/captcha');
  const question = res.body.data.question;
  const token = res.body.data.token;

  const match = question.match(/What is (\d+)\s+([\+\-\×\*])\s+(\d+)\?/);
  if (!match) throw new Error(`Could not parse captcha question: ${question}`);

  const a = parseInt(match[1], 10);
  const op = match[2];
  const b = parseInt(match[3], 10);

  let answer;
  if (op === '+') answer = a + b;
  else if (op === '-') answer = a - b;
  else if (op === '×' || op === '*') answer = a * b;

  return { answer, token };
}

describe('EcoTrack API', () => {
  test('GET /health returns 200', async () => {
    const res = await request('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  describe('Authentication - Registration', () => {
    test('Rejects registration with missing fields', async () => {
      const res = await request('POST', '/auth/register', { email: TEST_EMAIL });
      expect(res.status).toBe(400);
    });

    test('Rejects weak password (too short)', async () => {
      const res = await request('POST', '/auth/register', {
        email: TEST_EMAIL, password: '123', displayName: 'Test',
      });
      expect(res.status).toBe(400);
    });

    test('Rejects password without letters', async () => {
      const res = await request('POST', '/auth/register', {
        email: TEST_EMAIL, password: '123456789', displayName: 'Test',
      });
      expect(res.status).toBe(400);
    });

    test('Rejects registration with missing CAPTCHA', async () => {
      const res = await request('POST', '/auth/register', {
        email: TEST_EMAIL, password: TEST_PASSWORD, displayName: 'Test User',
      });
      expect(res.status).toBe(400);
    });

    test('Rejects registration with incorrect CAPTCHA', async () => {
      const res = await request('POST', '/auth/register', {
        email: TEST_EMAIL, password: TEST_PASSWORD, displayName: 'Test User',
        captchaAnswer: 999, captchaToken: '12345.badtokenhash'
      });
      expect(res.status).toBe(400);
    });

    test('Registers successfully with valid CAPTCHA', async () => {
      const { answer, token } = await getSolvedCaptcha();
      const res = await request('POST', '/auth/register', {
        email: TEST_EMAIL, password: TEST_PASSWORD, displayName: 'Test User',
        captchaAnswer: answer, captchaToken: token
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data?.user).not.toHaveProperty('password');
      authToken = res.body.data.token;
    });

    test('Rejects duplicate email registration', async () => {
      const { answer, token } = await getSolvedCaptcha();
      const res = await request('POST', '/auth/register', {
        email: TEST_EMAIL, password: TEST_PASSWORD, displayName: 'Dup',
        captchaAnswer: answer, captchaToken: token
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Authentication - Login', () => {
    test('Rejects incorrect password', async () => {
      const res = await request('POST', '/auth/login', {
        email: TEST_EMAIL, password: 'WrongPass1',
      });
      expect(res.status).toBe(401);
    });

    test('Rejects non-existent email', async () => {
      const res = await request('POST', '/auth/login', {
        email: 'nonexistent@test.com', password: TEST_PASSWORD,
      });
      expect(res.status).toBe(401);
    });

    test('Logs in successfully with correct credentials', async () => {
      const res = await request('POST', '/auth/login', {
        email: TEST_EMAIL, password: TEST_PASSWORD,
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
    });
  });

  describe('Protected Routes & Admin Access Control', () => {
    test('GET /profile returns 401 without token', async () => {
      const res = await request('GET', '/auth/profile');
      expect(res.status).toBe(401);
    });

    test('GET /profile returns 401 with invalid token', async () => {
      const res = await request('GET', '/auth/profile', null, 'invalid-token');
      expect(res.status).toBe(401);
    });

    test('GET /profile returns 200 with valid token', async () => {
      const res = await request('GET', '/auth/profile', null, authToken);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(TEST_EMAIL.toLowerCase());
    });

    test('Admin endpoints return 403 for non-admin user', async () => {
      const res1 = await request('GET', '/admin/stats', null, authToken);
      expect(res1.status).toBe(403);
      const res2 = await request('GET', '/admin/users', null, authToken);
      expect(res2.status).toBe(403);
    });

    test('Admin endpoints return 401 without token', async () => {
      const res = await request('GET', '/admin/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('Forgot Password & Brute Force Lockout', () => {
    test('Forgot password returns 200 and hides reset code', async () => {
      const res = await request('POST', '/auth/forgot-password', { email: TEST_EMAIL });
      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty('resetCode');
    });

    test('Brute force lockout invalidates code after 3 failed attempts', async () => {
      // Trigger forgot password
      await request('POST', '/auth/forgot-password', { email: TEST_EMAIL });

      // Wrong code 1
      const res1 = await request('POST', '/auth/reset-password', {
        email: TEST_EMAIL, resetCode: '999991', newPassword: 'NewSecurePass123'
      });
      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('attempts remaining');

      // Wrong code 2
      const res2 = await request('POST', '/auth/reset-password', {
        email: TEST_EMAIL, resetCode: '999992', newPassword: 'NewSecurePass123'
      });
      expect(res2.status).toBe(400);

      // Wrong code 3 -> Invalidation & Lockout
      const res3 = await request('POST', '/auth/reset-password', {
        email: TEST_EMAIL, resetCode: '999993', newPassword: 'NewSecurePass123'
      });
      expect(res3.status).toBe(400);
      expect(res3.body.error).toContain('Too many failed attempts');
    });
  });

  describe('Activities CRUD', () => {
    test('Creates an activity and recalculates eco score', async () => {
      const res = await request('POST', '/activities', {
        category: 'transportation', subCategory: 'car_gasoline',
        value: 10, unit: 'km', date: new Date().toISOString(),
      }, authToken);
      expect(res.status).toBe(201);
    });

    test('Lists activities', async () => {
      const res = await request('GET', '/activities?limit=5', null, authToken);
      expect(res.status).toBe(200);
    });

    test('Rejects activity creation without auth', async () => {
      const res = await request('POST', '/activities', {
        category: 'food', subCategory: 'beef_meal', value: 1, unit: 'meals',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Account Modifications & Sanitization', () => {
    test('Changes name successfully', async () => {
      const res = await request('PUT', '/auth/change-name', {
        displayName: 'Updated User',
      }, authToken);
      expect(res.status).toBe(200);
      expect(res.body.data.displayName).toBe('Updated User');
    });

    test('Rejects empty name', async () => {
      const res = await request('PUT', '/auth/change-name', {
        displayName: '',
      }, authToken);
      expect(res.status).toBe(400);
    });

    test('Changes password successfully', async () => {
      const res = await request('PUT', '/auth/change-password', {
        currentPassword: TEST_PASSWORD, newPassword: 'NewSecure456',
      }, authToken);
      expect(res.status).toBe(200);
    });

    test('Old password is invalidated and new password works', async () => {
      const resOld = await request('POST', '/auth/login', {
        email: TEST_EMAIL, password: TEST_PASSWORD,
      });
      expect(resOld.status).toBe(401);

      const resNew = await request('POST', '/auth/login', {
        email: TEST_EMAIL, password: 'NewSecure456',
      });
      expect(resNew.status).toBe(200);
    });

    test('HTML tags are stripped from user input (XSS prevention)', async () => {
      const { answer, token } = await getSolvedCaptcha();
      const res = await request('POST', '/auth/register', {
        email: `xss_${Date.now()}@test.com`,
        password: 'SafePass123',
        displayName: '<script>alert("xss")</script>Evil User',
        captchaAnswer: answer,
        captchaToken: token
      });
      expect(res.status).toBe(201);
      expect(res.body.data.user.displayName).not.toContain('<script>');
    });
  });

  describe('Account Deletion', () => {
    test('Deletes account and blocks subsequent logins', async () => {
      const loginRes = await request('POST', '/auth/login', {
        email: TEST_EMAIL, password: 'NewSecure456',
      });
      const token = loginRes.body.data.token;

      const deleteRes = await request('DELETE', '/auth/account', null, token);
      expect(deleteRes.status).toBe(200);

      const verifyLogin = await request('POST', '/auth/login', {
        email: TEST_EMAIL, password: 'NewSecure456',
      });
      expect(verifyLogin.status).toBe(401);
    });
  });
});
