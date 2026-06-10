/**
 * EcoTrack — API Integration Test Suite
 * Powered by Jest
 */

const http = require('http');
const app = require('../server'); // Import Express app
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

let server;
const PORT = 5001; // Use port 5001 for test isolation
const BASE = `http://localhost:${PORT}/api`;
let authToken = null;
const TEST_EMAIL = `test_${Date.now()}@ecotrack.com`;
const TEST_PASSWORD = 'TestPass123';

const db = require('../config/db');

function jwtSign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function requestNoBypass(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
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

beforeAll(async () => {
  await db.users.remove({}, { multi: true });
  await db.activities.remove({}, { multi: true });
  await db.challenges.remove({}, { multi: true });

  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    });
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
      const { answer, token } = await getSolvedCaptcha();
      const res = await request('POST', '/auth/register', {
        email: TEST_EMAIL, password: '123', displayName: 'Test',
        captchaAnswer: answer, captchaToken: token
      });
      expect(res.status).toBe(400);
    });

    test('Rejects password without letters', async () => {
      const { answer, token } = await getSolvedCaptcha();
      const res = await request('POST', '/auth/register', {
        email: TEST_EMAIL, password: '123456789', displayName: 'Test',
        captchaAnswer: answer, captchaToken: token
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

  describe('Profile Updates (Validation Checks)', () => {
    test('PUT /profile succeeds with valid updates', async () => {
      const res = await request('PUT', '/auth/profile', {
        householdSize: 3,
        region: 'india',
        dietType: 'vegan',
        primaryTransport: 'bicycle',
        monthlyGoal: 400
      }, authToken);
      expect(res.status).toBe(200);
      expect(res.body.data.profile.householdSize).toBe(3);
      expect(res.body.data.profile.region).toBe('india');
      expect(res.body.data.profile.dietType).toBe('vegan');
      expect(res.body.data.profile.primaryTransport).toBe('bicycle');
      expect(res.body.data.monthlyGoal).toBe(400);
    });

    test('PUT /profile fails with invalid householdSize', async () => {
      const res = await request('PUT', '/auth/profile', { householdSize: -1 }, authToken);
      expect(res.status).toBe(400);
    });

    test('PUT /profile fails with invalid region', async () => {
      const res = await request('PUT', '/auth/profile', { region: 'mars' }, authToken);
      expect(res.status).toBe(400);
    });

    test('PUT /profile fails with invalid dietType', async () => {
      const res = await request('PUT', '/auth/profile', { dietType: 'fastfood' }, authToken);
      expect(res.status).toBe(400);
    });

    test('PUT /profile fails with invalid primaryTransport', async () => {
      const res = await request('PUT', '/auth/profile', { primaryTransport: 'spaceship' }, authToken);
      expect(res.status).toBe(400);
    });

    test('PUT /profile fails with invalid monthlyGoal', async () => {
      const res = await request('PUT', '/auth/profile', { monthlyGoal: 0 }, authToken);
      expect(res.status).toBe(400);
    });
  });

  describe('Activities Date Validation & Listing Filters', () => {
    test('GET /activities query params', async () => {
      const res = await request('GET', '/activities?startDate=2026-01-01&endDate=2026-12-31&category=transportation', null, authToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /activities with invalid date is ignored but route still succeeds', async () => {
      const res = await request('GET', '/activities?startDate=invalid-date', null, authToken);
      expect(res.status).toBe(200);
    });
  });

  describe('Dashboard Analytics', () => {
    test('GET /dashboard/summary returns user carbon analytics', async () => {
      const res = await request('GET', '/dashboard/summary', null, authToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalCO2');
      expect(res.body.data).toHaveProperty('dailyAvg');
      expect(res.body.data).toHaveProperty('ecoScore');
    });

    test('GET /dashboard/category-breakdown', async () => {
      const res = await request('GET', '/dashboard/category-breakdown', null, authToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /dashboard/weekly-trend', async () => {
      const res = await request('GET', '/dashboard/weekly-trend', null, authToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(7);
    });

    test('GET /dashboard/monthly-trend', async () => {
      const res = await request('GET', '/dashboard/monthly-trend', null, authToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(30);
    });
  });

  describe('Insights & Tips', () => {
    test('GET /insights returns personalized tips', async () => {
      const res = await request('GET', '/insights', null, authToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /insights/comparison', async () => {
      const res = await request('GET', '/insights/comparison', null, authToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('userMonthly');
      expect(res.body.data).toHaveProperty('nationalAvg');
    });

    test('GET /insights/equivalencies', async () => {
      const res = await request('GET', '/insights/equivalencies', null, authToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('trees');
      expect(res.body.data).toHaveProperty('carKm');
    });
  });

  describe('Challenges & Badge Engine', () => {
    test('Join all available challenges & log activities to trigger auto-progress', async () => {
      // Find user document in database
      const testUser = await db.users.findOne({ email: TEST_EMAIL.toLowerCase() });
      expect(testUser).toBeDefined();

      // Manually set user's lastActiveDate to yesterday, longestStreak to 365, and totalCO2Saved to 600 to test streak & carbon badges
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      await db.users.update(
        { _id: testUser._id },
        {
          $set: {
            lastActiveDate: yesterdayDate.toISOString(),
            longestStreak: 365,
            totalCO2Saved: 600
          }
        }
      );

      // Manually insert 10 completed challenges to test ten challenges badge
      for (let i = 0; i < 10; i++) {
        await db.challenges.insert({
          userId: testUser._id,
          challengeId: `complete_ch_${i}`,
          title: `Challenge ${i}`,
          completed: true
        });
      }

      // Manually insert active challenges matching frontend challenges
      const frontendChallenges = [
        { id: 'meatless_week', title: 'Meatless Week', targetValue: 7, category: 'food', subCategory: 'vegetarian_meal' },
        { id: 'bike_to_work', title: 'Bike to Work', targetValue: 5, category: 'transportation', subCategory: 'bicycle' },
        { id: 'energy_detective', title: 'Energy Detective', targetValue: 15, category: 'energy', subCategory: 'solar' },
        { id: 'zero_waste_week', title: 'Zero Waste Week', targetValue: 7, category: 'shopping', subCategory: 'clothing_sustainable' },
        { id: 'public_transport', title: 'Public Transit Pro', targetValue: 5, category: 'transportation', subCategory: 'bus' }
      ];

      for (const fc of frontendChallenges) {
        await db.challenges.insert({
          userId: testUser._id,
          challengeId: fc.id,
          title: fc.title,
          description: 'Frontend Challenge',
          icon: '🏆',
          type: 'weekly',
          category: fc.category,
          targetValue: fc.targetValue,
          currentValue: 0,
          startDate: new Date(),
          endDate: new Date(),
          completed: false
        });
      }

      // Get all available templates
      const availRes = await request('GET', '/challenges/available', null, authToken);
      expect(availRes.status).toBe(200);
      const templates = availRes.body.data;

      // Join ALL templates to cover all auto-progress switch cases
      for (const tpl of templates) {
        await request('POST', `/challenges/join/${tpl.id}`, null, authToken);
      }

      // Log today's activity to trigger isYesterday streak increment
      await request('POST', '/activities', {
        category: 'transportation', subCategory: 'car_gasoline',
        value: 10, unit: 'km', date: new Date().toISOString(),
      }, authToken);

      // Log diverse activity categories & subcategories to cover emission factors & progress increments
      const activitiesToLog = [
        // Food subcategories
        { category: 'food', subCategory: 'vegan_meal', value: 100 },
        { category: 'food', subCategory: 'vegan_meal', value: 2 },
        { category: 'food', subCategory: 'vegetarian_meal', value: 3 },
        { category: 'food', subCategory: 'chicken_meal', value: 1 },
        { category: 'food', subCategory: 'fish_meal', value: 1 },
        { category: 'food', subCategory: 'beef_meal', value: 1 },
        { category: 'food', subCategory: 'lamb_meal', value: 1 },
        { category: 'food', subCategory: 'pork_meal', value: 1 },
        { category: 'food', subCategory: 'dairy_heavy', value: 1 },
        // Transportation subcategories
        { category: 'transportation', subCategory: 'bicycle', value: 5 },
        { category: 'transportation', subCategory: 'walking', value: 5 },
        { category: 'transportation', subCategory: 'car_electric', value: 20 },
        { category: 'transportation', subCategory: 'bus', value: 15 },
        { category: 'transportation', subCategory: 'train', value: 25 },
        { category: 'transportation', subCategory: 'subway', value: 10 },
        { category: 'transportation', subCategory: 'carpool', value: 15 },
        // Energy subcategories
        { category: 'energy', subCategory: 'solar', value: 50 },
        { category: 'energy', subCategory: 'wind', value: 40 },
        // Shopping subcategories
        { category: 'shopping', subCategory: 'clothing_sustainable', value: 50 },
        { category: 'shopping', subCategory: 'clothing_fast', value: 30 }
      ];

      for (const act of activitiesToLog) {
        const logRes = await request('POST', '/activities', act, authToken);
        expect(logRes.status).toBe(201);
      }

      // Loop to log 30 of each activity type to trigger all badges!
      for (let i = 0; i < 30; i++) {
        await request('POST', '/activities', { category: 'transportation', subCategory: 'bicycle', value: 1 }, authToken);
        await request('POST', '/activities', { category: 'transportation', subCategory: 'walking', value: 1 }, authToken);
        await request('POST', '/activities', { category: 'transportation', subCategory: 'bus', value: 1 }, authToken);
        await request('POST', '/activities', { category: 'food', subCategory: 'vegan_meal', value: 1 }, authToken);
        await request('POST', '/activities', { category: 'energy', subCategory: 'solar', value: 1 }, authToken);
        await request('POST', '/activities', { category: 'shopping', subCategory: 'clothing_sustainable', value: 1 }, authToken);
      }

      // Check active challenges to ensure progress has incremented
      const activeRes = await request('GET', '/challenges/active', null, authToken);
      expect(activeRes.status).toBe(200);
      expect(activeRes.body.data.length).toBeGreaterThan(0);

      // Manually increment challenge progress to completion to test badge awarding
      const activeCh = activeRes.body.data[0];
      const completeRes = await request('PUT', `/challenges/${activeCh._id}/progress`, { increment: 100 }, authToken);
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.completed).toBe(true);

      // Verify badges list retrieves earned status
      const badgesRes = await request('GET', '/challenges/badges', null, authToken);
      expect(badgesRes.status).toBe(200);
      expect(badgesRes.body.data).toHaveProperty('badges');
      expect(badgesRes.body.data).toHaveProperty('all');
    });
  });

  describe('Leaderboard', () => {
    test('GET /leaderboard', async () => {
      const res = await request('GET', '/leaderboard');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /leaderboard/rank', async () => {
      const res = await request('GET', '/leaderboard/rank', null, authToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('rank');
      expect(res.body.data).toHaveProperty('totalUsers');
    });
  });

  describe('Admin Operations', () => {
    let adminToken = null;

    test('Registers admin@ecotrack.com user', async () => {
      const { answer, token } = await getSolvedCaptcha();
      const res = await request('POST', '/auth/register', {
        email: 'admin@ecotrack.com',
        password: TEST_PASSWORD,
        displayName: 'System Admin',
        captchaAnswer: answer,
        captchaToken: token
      });
      expect(res.status).toBe(201);
      adminToken = res.body.data.token;
    });

    test('GET /admin/stats succeeds for admin', async () => {
      const res = await request('GET', '/admin/stats', null, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('totalActivities');
    });

    test('GET /admin/users succeeds for admin', async () => {
      const res = await request('GET', '/admin/users', null, adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
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

  describe('Extra Edge Cases for 100% Coverage', () => {
    let extraUserToken;
    let extraUserId;
    const EXTRA_EMAIL = `extra_${Date.now()}@ecotrack.com`;

    beforeAll(async () => {
      const { answer, token } = await getSolvedCaptcha();
      const res = await request('POST', '/auth/register', {
        email: EXTRA_EMAIL, password: TEST_PASSWORD, displayName: 'Extra User',
        captchaAnswer: answer, captchaToken: token
      });
      extraUserToken = res.body.data.token;
      extraUserId = res.body.data.user._id;
    });

    test('cleanNoSQL and cleanXSS recursion & deletions', async () => {
      const { answer, token } = await getSolvedCaptcha();
      const payload = {
        email: `nested_${Date.now()}@test.com`,
        password: 'NestedPass123',
        displayName: 'Nested <b>User</b>',
        nested: {
          '$operator': 'evil',
          'field.dot': 'evil',
          'safeField': 'ok',
          deep: {
            'html': '<i>value</i>',
            'another$op': 'fine'
          }
        },
        captchaAnswer: answer,
        captchaToken: token
      };
      const res = await request('POST', '/auth/register', payload);
      expect(res.status).toBe(201);
      const user = await db.users.findOne({ email: payload.email });
      expect(user.displayName).toBe('Nested User');
    });

    test('Rate Limiter Triggering', async () => {
      let response;
      for (let i = 0; i < 22; i++) {
        response = await requestNoBypass('GET', '/auth/captcha');
      }
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many requests');
    });

    test('POST /auth/verify-captcha validation & results', async () => {
      const res1 = await request('POST', '/auth/verify-captcha', {});
      expect(res1.status).toBe(400);

      const res2 = await request('POST', '/auth/verify-captcha', { captchaAnswer: 5, captchaToken: 'bad' });
      expect(res2.status).toBe(400);

      const { token } = await getSolvedCaptcha();
      const res3 = await request('POST', '/auth/verify-captcha', { captchaAnswer: 9999, captchaToken: token });
      expect(res3.status).toBe(400);

      const solved = await getSolvedCaptcha();
      const res4 = await request('POST', '/auth/verify-captcha', { captchaAnswer: solved.answer, captchaToken: solved.token });
      expect(res4.status).toBe(200);
      expect(res4.body.data.verified).toBe(true);
    });

    test('Registration captcha validation details', async () => {
      const expiredTimestamp = Date.now() - 6 * 60 * 1000;
      const expiredToken = `${expiredTimestamp}.somehash`;
      const res1 = await request('POST', '/auth/register', {
        email: 'exp@test.com', password: TEST_PASSWORD, displayName: 'Expired',
        captchaAnswer: 5, captchaToken: expiredToken
      });
      expect(res1.status).toBe(400);

      const res2 = await request('POST', '/auth/register', {
        email: 'exp2@test.com', password: TEST_PASSWORD, displayName: 'Expired',
        captchaAnswer: 5, captchaToken: 'invalid'
      });
      expect(res2.status).toBe(400);
    });

    test('POST /auth/login validations', async () => {
      const res = await request('POST', '/auth/login', {});
      expect(res.status).toBe(400);
    });

    test('Profile / Sync not found in DB', async () => {
      const fakeToken = jwtSign({ _id: 'fake_id_123', email: 'fake@test.com', displayName: 'Fake' });
      const resProfile = await request('GET', '/auth/profile', null, fakeToken);
      expect(resProfile.status).toBe(404);

      const resSync = await request('POST', '/auth/sync', null, fakeToken);
      expect(resSync.status).toBe(404);
    });

    test('PUT /auth/profile validations', async () => {
      const res = await request('PUT', '/auth/profile', {}, extraUserToken);
      expect(res.status).toBe(400);
    });

    test('PUT /auth/change-password validations', async () => {
      const res1 = await request('PUT', '/auth/change-password', {}, extraUserToken);
      expect(res1.status).toBe(400);

      const res2 = await request('PUT', '/auth/change-password', { currentPassword: TEST_PASSWORD, newPassword: '123' }, extraUserToken);
      expect(res2.status).toBe(400);

      const res3 = await request('PUT', '/auth/change-password', { currentPassword: TEST_PASSWORD, newPassword: 'letters_only' }, extraUserToken);
      expect(res3.status).toBe(400);

      const res4 = await request('PUT', '/auth/change-password', { currentPassword: 'WrongPassword', newPassword: 'NewPassword123' }, extraUserToken);
      expect(res4.status).toBe(401);

      const fakeToken = jwtSign({ _id: 'fake_id_123', email: 'fake@test.com' });
      const res5 = await request('PUT', '/auth/change-password', { currentPassword: TEST_PASSWORD, newPassword: 'NewPassword123' }, fakeToken);
      expect(res5.status).toBe(404);
    });

    test('PUT /auth/change-name validations', async () => {
      const res = await request('PUT', '/auth/change-name', { displayName: '   ' }, extraUserToken);
      expect(res.status).toBe(400);
    });

    test('POST /auth/forgot-password with non-existent email', async () => {
      const res = await request('POST', '/auth/forgot-password', { email: 'nonexistent@test.com' });
      expect(res.status).toBe(200);
    });

    test('POST /auth/reset-password validations & expired token', async () => {
      const res1 = await request('POST', '/auth/reset-password', {});
      expect(res1.status).toBe(400);

      const res2 = await request('POST', '/auth/reset-password', { email: EXTRA_EMAIL, resetCode: '123456', newPassword: '123' });
      expect(res2.status).toBe(400);

      const res3 = await request('POST', '/auth/reset-password', { email: 'fake@test.com', resetCode: '123456', newPassword: 'NewPassword123' });
      expect(res3.status).toBe(400);

      const res4 = await request('POST', '/auth/reset-password', { email: EXTRA_EMAIL, resetCode: '123456', newPassword: 'NewPassword123' });
      expect(res4.status).toBe(400);

      await request('POST', '/auth/forgot-password', { email: EXTRA_EMAIL });
      const extraUser = await db.users.findOne({ email: EXTRA_EMAIL });
      const correctCode = extraUser.resetCode;

      await db.users.update({ _id: extraUserId }, { $set: { resetExpiry: new Date(Date.now() - 1000).toISOString() } });
      const res5 = await request('POST', '/auth/reset-password', { email: EXTRA_EMAIL, resetCode: correctCode, newPassword: 'NewPassword123' });
      expect(res5.status).toBe(400);
      expect(res5.body.error).toContain('expired');
    });

    test('Activities edge cases', async () => {
      const res1 = await request('POST', '/activities', {}, extraUserToken);
      expect(res1.status).toBe(400);

      const res2 = await request('POST', '/activities', { category: 'food', subCategory: 'spaceship_fuel', value: 10 }, extraUserToken);
      expect(res2.status).toBe(400);

      const actRes = await request('POST', '/activities', { category: 'food', subCategory: 'vegan_meal', value: 1 }, extraUserToken);
      const actId = actRes.body.data._id;

      const getRes = await request('GET', `/activities/${actId}`, null, extraUserToken);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.subCategory).toBe('vegan_meal');

      const getRes2 = await request('GET', `/activities/fake_id_act`, null, extraUserToken);
      expect(getRes2.status).toBe(404);

      const getRes3 = await request('GET', `/activities/${actId}`, null, authToken);
      expect(getRes3.status).toBe(403);

      const delRes1 = await request('DELETE', `/activities/fake_id_act`, null, extraUserToken);
      expect(delRes1.status).toBe(404);

      const delRes2 = await request('DELETE', `/activities/${actId}`, null, authToken);
      expect(delRes2.status).toBe(403);

      const delRes3 = await request('DELETE', `/activities/${actId}`, null, extraUserToken);
      expect(delRes3.status).toBe(200);
    });

    test('Challenges edge cases', async () => {
      const res1 = await request('POST', '/challenges/join/fake_template', null, extraUserToken);
      expect(res1.status).toBe(404);

      await request('POST', '/challenges/join/meatless_monday', null, extraUserToken);
      const res2 = await request('POST', '/challenges/join/meatless_monday', null, extraUserToken);
      expect(res2.status).toBe(400);

      const res3 = await request('PUT', '/challenges/fake_challenge/progress', { increment: 1 }, extraUserToken);
      expect(res3.status).toBe(404);

      const activeCh = await db.challenges.findOne({ userId: extraUserId, challengeId: 'meatless_monday' });
      const res4 = await request('PUT', `/challenges/${activeCh._id}/progress`, { increment: 10 }, extraUserToken);
      expect(res4.status).toBe(200);
      expect(res4.body.data.completed).toBe(true);

      const res5 = await request('PUT', `/challenges/${activeCh._id}/progress`, { increment: 1 }, extraUserToken);
      expect(res5.status).toBe(400);
    });

    test('Badges and leaderboard rank user not found', async () => {
      const fakeToken = jwtSign({ _id: 'fake_id_123', email: 'fake@test.com' });
      const res1 = await request('GET', '/challenges/badges', null, fakeToken);
      expect(res1.status).toBe(404);

      const res2 = await request('GET', '/leaderboard/rank', null, fakeToken);
      expect(res2.status).toBe(404);
    });

    test('Registration incorrect captcha answer (not expired)', async () => {
      const currentTimestamp = Date.now();
      const token = `${currentTimestamp}.wronghash`;
      const res = await request('POST', '/auth/register', {
        email: 'wrongcaptcha@test.com', password: TEST_PASSWORD, displayName: 'Wrong CAPTCHA',
        captchaAnswer: 999, captchaToken: token
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Incorrect CAPTCHA answer');
    });

    test('Streak resets to 1 if last active was 5 days ago', async () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      await db.users.update({ _id: extraUserId }, { $set: { lastActiveDate: fiveDaysAgo.toISOString() } });

      await request('POST', '/activities', {
        category: 'transportation', subCategory: 'car_gasoline',
        value: 10, unit: 'km', date: new Date().toISOString()
      }, extraUserToken);

      const checkUser = await db.users.findOne({ _id: extraUserId });
      expect(checkUser.currentStreak).toBe(1);
    });

    test('Successful password reset flow', async () => {
      const fpRes = await request('POST', '/auth/forgot-password', { email: EXTRA_EMAIL });
      expect(fpRes.status).toBe(200);

      const userObj = await db.users.findOne({ email: EXTRA_EMAIL });
      expect(userObj.resetCode).toBeDefined();

      const rpRes = await request('POST', '/auth/reset-password', {
        email: EXTRA_EMAIL,
        resetCode: userObj.resetCode,
        newPassword: 'BrandNewSecurePass123'
      });
      expect(rpRes.status).toBe(200);

      const loginRes = await request('POST', '/auth/login', {
        email: EXTRA_EMAIL, password: 'BrandNewSecurePass123'
      });
      expect(loginRes.status).toBe(200);
      extraUserToken = loginRes.body.data.token;
    });

    test('POST /activities rejects negative/zero values', async () => {
      const res = await request('POST', '/activities', {
        category: 'food', subCategory: 'vegan_meal', value: -5
      }, extraUserToken);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('positive number');
    });

    test('Database errors trigger 500 status codes', async () => {
      const originalFindOne = db.users.findOne;
      db.users.findOne = () => { throw new Error('Simulated DB Error'); };
      const res1 = await request('GET', '/auth/profile', null, extraUserToken);
      expect(res1.status).toBe(500);

      const res2 = await request('POST', '/auth/sync', null, extraUserToken);
      expect(res2.status).toBe(500);

      const res3 = await request('PUT', '/auth/change-password', { currentPassword: 'BrandNewSecurePass123', newPassword: 'AnotherPass123' }, extraUserToken);
      expect(res3.status).toBe(500);

      const res4 = await request('PUT', '/auth/change-name', { displayName: 'Name' }, extraUserToken);
      expect(res4.status).toBe(500);
      db.users.findOne = originalFindOne;

      const originalFindAct = db.activities.find;
      db.activities.find = () => { throw new Error('Simulated DB Error'); };
      const res5 = await request('GET', '/activities', null, extraUserToken);
      expect(res5.status).toBe(500);

      const res6 = await request('GET', '/dashboard/summary', null, extraUserToken);
      expect(res6.status).toBe(500);

      const res7 = await request('GET', '/insights', null, extraUserToken);
      expect(res7.status).toBe(500);
      db.activities.find = originalFindAct;

      const originalCount = db.users.count;
      db.users.count = () => { throw new Error('Simulated DB Error'); };
      
      const adminLogin = await request('POST', '/auth/login', {
        email: 'admin@ecotrack.com', password: TEST_PASSWORD
      });
      const adminToken = adminLogin.body.data.token;
      const res9 = await request('GET', '/admin/stats', null, adminToken);
      expect(res9.status).toBe(500);
      db.users.count = originalCount;

      const originalFindUsers = db.users.find;
      db.users.find = () => { throw new Error('Simulated DB Error'); };
      const res10 = await request('GET', '/admin/users', null, adminToken);
      expect(res10.status).toBe(500);

      const res11 = await request('GET', '/leaderboard');
      expect(res11.status).toBe(500);
      db.users.find = originalFindUsers;
    });

    test('Admin user deletions', async () => {
      const adminLogin = await request('POST', '/auth/login', {
        email: 'admin@ecotrack.com', password: TEST_PASSWORD
      });
      const adminToken = adminLogin.body.data.token;
      const adminId = adminLogin.body.data.user._id;

      const res1 = await request('DELETE', `/admin/users/${adminId}`, null, adminToken);
      expect(res1.status).toBe(400);

      const res2 = await request('DELETE', `/admin/users/${extraUserId}`, null, adminToken);
      expect(res2.status).toBe(200);

      const checkUser = await db.users.findOne({ _id: extraUserId });
      expect(checkUser).toBeNull();
    });

    test('Optional Auth invalid token sets user to null', async () => {
      const res = await request('GET', '/leaderboard', null, 'invalid-bearer-token');
      expect(res.status).toBe(200);
    });
  });
});
