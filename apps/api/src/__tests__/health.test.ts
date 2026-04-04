import request from 'supertest';
import { app } from '../app.js';

describe('Health Check', () => {
  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('version');
  });
});
