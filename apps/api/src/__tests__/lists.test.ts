import request from 'supertest';
import { app } from '../app.js';

describe('Lists Routes', () => {
  describe('GET /lists', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/lists');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });

  describe('POST /lists', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/lists')
        .send({ name: 'Test List' });
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });

  describe('GET /lists/:id', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/lists/123');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });

  describe('PUT /lists/:id', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .put('/lists/123')
        .send({ name: 'Updated List' });
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });

  describe('DELETE /lists/:id', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).delete('/lists/123');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });
});

describe('Item Routes', () => {
  describe('POST /lists/:id/items', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/lists/123/items')
        .send({ name: 'Test Item' });
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });

  describe('GET /lists/:id/items', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/lists/123/items');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });

  describe('PUT /lists/:id/items/:itemId', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .put('/lists/123/items/456')
        .send({ name: 'Updated Item' });
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });

  describe('DELETE /lists/:id/items/:itemId', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).delete('/lists/123/items/456');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });
});
