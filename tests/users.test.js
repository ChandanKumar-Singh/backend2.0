import request from 'supertest';
import app from '../src/app.js';
import database from '../src/config/database.js';
import User from '../src/modules/users/user.model.js';

describe('Users Endpoints', () => {
  let server;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    await database.connect();
    server = app.listen(0);
  });

  afterAll(async () => {
    await database.disconnect();
    server.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});

    // Create admin user
    const adminData = {
      username: 'admin',
      email: 'admin@example.com',
      password: 'AdminPass123!',
      role: 'admin',
    };

    const adminResponse = await request(app)
      .post('/api/v1/app/auth/register')
      .send(adminData);

    adminToken = adminResponse.body.data.tokens.accessToken;

    // Create regular user
    const userData = {
      username: 'testuser',
      email: 'user@example.com',
      password: 'UserPass123!',
    };

    const userResponse = await request(app)
      .post('/api/v1/app/auth/register')
      .send(userData);

    userToken = userResponse.body.data.tokens.accessToken;
  });

  describe('GET /api/v1/admin/users', () => {
    it('should get all users as admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should not get users as regular user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not get users without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].role).toBe('admin');
    });

    it('should paginate users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(1);
      expect(response.body.meta.pagination.total).toBe(2);
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    let userId;

    beforeEach(async () => {
      const users = await User.find();
      userId = users.find(u => u.role === 'user')._id;
    });

    it('should get user by ID as admin', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(userId.toString());
    });

    it('should not get user by ID as regular user', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/users', () => {
    it('should create new user as admin', async () => {
      const newUserData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'NewPass123!',
        role: 'user',
      };

      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(newUserData.username);
      expect(response.body.data.email).toBe(newUserData.email);
      expect(response.body.data.role).toBe(newUserData.role);
    });

    it('should not create user as regular user', async () => {
      const newUserData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'NewPass123!',
      };

      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newUserData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not create user with invalid data', async () => {
      const invalidUserData = {
        username: 'nu',
        email: 'invalid-email',
        password: '123',
      };

      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/admin/users/:id', () => {
    let userId;

    beforeEach(async () => {
      const users = await User.find();
      userId = users.find(u => u.role === 'user')._id;
    });

    it('should update user as admin', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com',
      };

      const response = await request(app)
        .put(`/api/v1/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(updateData.username);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should not update user as regular user', async () => {
      const updateData = {
        username: 'updateduser',
      };

      const response = await request(app)
        .put(`/api/v1/admin/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/admin/users/:id', () => {
    let userId;

    beforeEach(async () => {
      const users = await User.find();
      userId = users.find(u => u.role === 'user')._id;
    });

    it('should delete user as admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not delete user as regular user', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/users/stats', () => {
    it('should get user statistics as admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.active).toBe(2);
      expect(response.body.data.admin).toBe(1);
      expect(response.body.data.user).toBe(1);
    });

    it('should not get user statistics as regular user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
