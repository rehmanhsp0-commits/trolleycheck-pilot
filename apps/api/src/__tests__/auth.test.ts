import request from 'supertest';

const mockUserCreate = jest.fn();

jest.mock('../lib/prisma.js', () => ({
  getPrisma: jest.fn(() => ({
    user: { create: mockUserCreate },
    $queryRaw: jest.fn(async () => 1),
    $disconnect: jest.fn(async () => {}),
  })),
  disconnectPrisma: jest.fn(async () => {}),
}));

jest.mock('../middleware/rateLimit.js', () => ({
  generalRateLimit: (_req: any, _res: any, next: any) => next(),
  authRateLimit: (_req: any, _res: any, next: any) => next(),
}));

const mockRegisterUser = jest.fn();
const mockLoginUser = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockLogoutUser = jest.fn();
const mockDeleteUserAccount = jest.fn();

jest.mock('../lib/supabase.js', () => ({
  verifyToken: jest.fn(async () => ({ id: 'test-user-id', email: 'test@example.com' })),
  registerUser: (...args: any[]) => mockRegisterUser(...args),
  loginUser: (...args: any[]) => mockLoginUser(...args),
  refreshAccessToken: (...args: any[]) => mockRefreshAccessToken(...args),
  logoutUser: (...args: any[]) => mockLogoutUser(...args),
  deleteUserAccount: (...args: any[]) => mockDeleteUserAccount(...args),
}));

const mockIsLoginLocked = jest.fn();
const mockIncrementFailedLogin = jest.fn();
const mockClearFailedLogin = jest.fn();

jest.mock('../lib/cache.js', () => ({
  isRedisHealthy: jest.fn(async () => true),
  disconnectRedis: jest.fn(async () => {}),
  isLoginLocked: (...args: any[]) => mockIsLoginLocked(...args),
  incrementFailedLogin: (...args: any[]) => mockIncrementFailedLogin(...args),
  clearFailedLogin: (...args: any[]) => mockClearFailedLogin(...args),
}));

import { app } from '../app.js';

const VALID_REGISTER = { email: 'user@example.com', password: 'Password1!' };
const VALID_LOGIN = { email: 'user@example.com', password: 'Password1!' };
const AUTH_RESULT = {
  user: { id: 'user-1', email: 'user@example.com' },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

describe('POST /auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers successfully and returns 201', async () => {
    mockRegisterUser.mockResolvedValue(AUTH_RESULT);
    mockUserCreate.mockResolvedValue({ id: 'user-1', email: 'user@example.com', createdAt: new Date(), updatedAt: new Date() });

    const res = await request(app).post('/auth/register').send(VALID_REGISTER);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken', 'access-token');
    expect(res.body).toHaveProperty('refreshToken', 'refresh-token');
    expect(res.body.user).toHaveProperty('id', 'user-1');
  });

  it('returns 409 on duplicate email (P2002)', async () => {
    mockRegisterUser.mockResolvedValue(AUTH_RESULT);
    mockUserCreate.mockRejectedValue({ code: 'P2002' });

    const res = await request(app).post('/auth/register').send(VALID_REGISTER);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'CONFLICT' });
  });

  it('returns err.status when supabase throws structured error', async () => {
    mockRegisterUser.mockRejectedValue({ status: 422, code: 'WEAK_PASSWORD', message: 'Password too weak' });

    const res = await request(app).post('/auth/register').send(VALID_REGISTER);

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: 'WEAK_PASSWORD' });
  });

  it('returns 500 on unexpected error', async () => {
    mockRegisterUser.mockRejectedValue(new Error('db exploded'));

    const res = await request(app).post('/auth/register').send(VALID_REGISTER);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });

  it('returns 400 for missing email', async () => {
    const res = await request(app).post('/auth/register').send({ password: 'Password1!' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'not-an-email', password: 'Password1!' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoginLocked.mockResolvedValue({ isLocked: false, remainingSeconds: 0 });
    mockClearFailedLogin.mockResolvedValue(undefined);
  });

  it('logs in successfully and returns 200', async () => {
    mockLoginUser.mockResolvedValue(AUTH_RESULT);

    const res = await request(app).post('/auth/login').send(VALID_LOGIN);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken', 'access-token');
  });

  it('returns 429 when account is locked', async () => {
    mockIsLoginLocked.mockResolvedValue({ isLocked: true, remainingSeconds: 120 });

    const res = await request(app).post('/auth/login').send(VALID_LOGIN);

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ error: 'ACCOUNT_LOCKED', retryAfter: 120 });
  });

  it('returns 401 on bad credentials and increments counter', async () => {
    mockLoginUser.mockRejectedValue({ status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    mockIncrementFailedLogin.mockResolvedValue({ attempts: 2, isLocked: false, remainingSeconds: 0 });

    const res = await request(app).post('/auth/login').send(VALID_LOGIN);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'UNAUTHORIZED' });
    expect(mockIncrementFailedLogin).toHaveBeenCalledWith('user@example.com');
  });

  it('returns 429 when lockout triggered by failed login', async () => {
    mockLoginUser.mockRejectedValue({ status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    mockIncrementFailedLogin.mockResolvedValue({ attempts: 5, isLocked: true, remainingSeconds: 300 });

    const res = await request(app).post('/auth/login').send(VALID_LOGIN);

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ error: 'ACCOUNT_LOCKED' });
  });

  it('rethrows non-401 login errors', async () => {
    mockLoginUser.mockRejectedValue(new Error('db error'));

    const res = await request(app).post('/auth/login').send(VALID_LOGIN);

    expect(res.status).toBe(500);
  });

  it('returns err.status on structured login error', async () => {
    mockLoginUser.mockRejectedValue({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Auth service down' });

    const res = await request(app).post('/auth/login').send(VALID_LOGIN);

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: 'SERVICE_UNAVAILABLE' });
  });

  it('returns 400 for missing password', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'user@example.com' });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  beforeEach(() => jest.clearAllMocks());

  it('refreshes token successfully', async () => {
    mockRefreshAccessToken.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });

    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'old-refresh' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken', 'new-access');
  });

  it('returns err.status on structured error', async () => {
    mockRefreshAccessToken.mockRejectedValue({ status: 401, code: 'INVALID_TOKEN', message: 'Token expired' });

    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'bad-token' });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'INVALID_TOKEN' });
  });

  it('returns 500 on unexpected error', async () => {
    mockRefreshAccessToken.mockRejectedValue(new Error('unexpected'));

    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'token' });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });

  it('returns 400 when refreshToken missing', async () => {
    const res = await request(app).post('/auth/refresh').send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/logout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs out successfully', async () => {
    mockLogoutUser.mockResolvedValue({ message: 'Logged out' });

    const res = await request(app).post('/auth/logout').send({ refreshToken: 'token' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Logged out' });
  });

  it('returns err.status on structured error', async () => {
    mockLogoutUser.mockRejectedValue({ status: 401, code: 'INVALID_TOKEN', message: 'Token expired' });

    const res = await request(app).post('/auth/logout').send({ refreshToken: 'token' });

    expect(res.status).toBe(401);
  });

  it('returns 500 on unexpected error', async () => {
    mockLogoutUser.mockRejectedValue(new Error('unexpected'));

    const res = await request(app).post('/auth/logout').send({ refreshToken: 'token' });

    expect(res.status).toBe(500);
  });
});

describe('DELETE /auth/account', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes account and returns 204', async () => {
    mockDeleteUserAccount.mockResolvedValue(undefined);

    const res = await request(app).delete('/auth/account').send({ refreshToken: 'token' });

    expect(res.status).toBe(204);
  });

  it('returns err.status on structured error', async () => {
    mockDeleteUserAccount.mockRejectedValue({ status: 401, code: 'INVALID_TOKEN', message: 'Expired' });

    const res = await request(app).delete('/auth/account').send({ refreshToken: 'token' });

    expect(res.status).toBe(401);
  });

  it('returns 500 on unexpected error', async () => {
    mockDeleteUserAccount.mockRejectedValue(new Error('unexpected'));

    const res = await request(app).delete('/auth/account').send({ refreshToken: 'token' });

    expect(res.status).toBe(500);
  });
});
