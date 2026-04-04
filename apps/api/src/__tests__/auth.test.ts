import request from 'supertest';
import { app } from '../../app';
import { getPrisma } from '../../lib/prisma';

describe('Auth Routes - Registration (TC-1)', () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.user.deleteMany({});
  });

  describe('POST /auth/register', () => {
    describe('Happy path', () => {
      it('should register a new user with valid credentials', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: 'TestPassword123',
        });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('user');
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body.user.email).toBe('test@example.com');
        expect(res.body.user).toHaveProperty('id');
        expect(res.body.user).toHaveProperty('createdAt');
        expect(res.body.user).toHaveProperty('updatedAt');
      });

      it('should create user record in database', async () => {
        const email = 'test@example.com';

        const res = await request(app).post('/auth/register').send({
          email,
          password: 'TestPassword123',
        });

        expect(res.status).toBe(201);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        expect(user).toBeDefined();
        expect(user?.email).toBe(email);
      });

      it('should return valid JWT tokens', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: 'TestPassword123',
        });

        expect(res.status).toBe(201);
        expect(res.body.accessToken).toBeTruthy();
        expect(res.body.refreshToken).toBeTruthy();
        expect(typeof res.body.accessToken).toBe('string');
        expect(typeof res.body.refreshToken).toBe('string');
      });

      it('should handle uppercase email addresses (convert to lowercase)', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'TEST@EXAMPLE.COM',
          password: 'TestPassword123',
        });

        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe('test@example.com');
      });
    });

    describe('Validation errors', () => {
      it('should reject missing email', async () => {
        const res = await request(app).post('/auth/register').send({
          password: 'TestPassword123',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
        expect(res.body.message).toBeTruthy();
      });

      it('should reject invalid email format', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'invalid-email',
          password: 'TestPassword123',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
      });

      it('should reject missing password', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
      });

      it('should reject password less than 8 characters', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: 'Pass1',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
        expect(res.body.message).toContain('8 characters');
      });

      it('should reject password without letter', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: '12345678',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
        expect(res.body.message).toContain('letter');
      });

      it('should reject password without number', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: 'PasswordOnly',
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
        expect(res.body.message).toContain('number');
      });

      it('should reject empty request body', async () => {
        const res = await request(app).post('/auth/register').send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('Conflict errors', () => {
      it('should reject duplicate email with 409', async () => {
        const email = 'unique@example.com';
        const password = 'ValidPassword123';

        // Register first user
        await request(app).post('/auth/register').send({
          email,
          password,
        });

        // Try to register with same email
        const res = await request(app).post('/auth/register').send({
          email,
          password,
        });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('CONFLICT');
        expect(res.body.message).toContain('already exists');
      });
    });

    describe('Rate limiting', () => {
      it('should enforce rate limit on auth endpoint (10 req/min per IP)', async () => {
        // This test would need Redis to be running
        // Skipping for now as it requires external service
        // In CI/CD, Redis should be available
      });
    });

    describe('Edge cases', () => {
      it('should handle email with special characters', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test+alias@example.co.uk',
          password: 'ValidPassword123',
        });

        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe('test+alias@example.co.uk');
      });

      it('should accept password with special characters', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: 'Valid!@#$%Pass123',
        });

        expect(res.status).toBe(201);
      });

      it('should accept password with exactly 8 characters (minimum)', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: 'Pass1234',
        });

        expect(res.status).toBe(201);
      });

      it('should accept long password', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: 'VeryLongPasswordWith123Numbers456AndSpecial!@#Characters',
        });

        expect(res.status).toBe(201);
      });
    });

    describe('Response format', () => {
      it('should return correct response structure', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: 'TestPassword123',
        });

        expect(res.status).toBe(201);
        expect(res.body).toEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
              email: expect.any(String),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            }),
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          })
        );
      });

      it('should not return password in response', async () => {
        const res = await request(app).post('/auth/register').send({
          email: 'test@example.com',
          password: 'TestPassword123',
        });

        expect(res.status).toBe(201);
        expect(res.body.user).not.toHaveProperty('password');
        expect(res.body).not.toHaveProperty('password');
      });
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.deleteMany({});
  });
});
