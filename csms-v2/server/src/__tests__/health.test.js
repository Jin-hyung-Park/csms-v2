/**
 * Health Check API 테스트
 */

const request = require('supertest');
const app = require('../app');

describe('Health Check API', () => {
  it('GET /api/health는 서버 상태를 반환해야 함', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body.message).toBeDefined();
  });

  it('GET /api/health/ping은 pong을 반환해야 함', async () => {
    const response = await request(app)
      .get('/api/health/ping')
      .expect(200);

    expect(response.text).toBe('pong');
  });
});

