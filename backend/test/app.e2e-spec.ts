import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { Role } from '../src/users/role.enum';
import { User } from '../src/users/user.entity';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://sfc:sfc_password@localhost:5432/sampath_food_city_test';
process.env.JWT_SECRET = 'e2e-test-secret';
process.env.RUN_MIGRATIONS = 'true';

describe('Sampath Food City API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ds: DataSource;
  let adminToken: string;
  let aliceToken: string;
  let bobToken: string;
  let categoryId: string;
  let riceId: string;
  let teaId: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const order = (token: string, items: { productId: string; quantity: number }[]) =>
    http.post('/api/orders').set(auth(token)).send({
      items, deliveryAddress: '12 Galle Road, Dehiwala', deliveryCity: 'Colombo', phone: '0771234567',
      paymentMethod: 'CASH_ON_DELIVERY',
    });
  const stockOf = async (id: string) => (await http.get(`/api/products/${id}`)).body.stock as number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(moduleRef.createNestApplication());
    await app.init();
    http = request(app.getHttpServer());
    ds = app.get(DataSource);

    await ds.query('TRUNCATE TABLE stock_movements, order_items, orders, products, categories, users RESTART IDENTITY CASCADE');
    await ds.getRepository(User).insert({
      email: 'admin@test.local', fullName: 'Test Admin', role: Role.ADMIN, passwordHash: await bcrypt.hash('Admin@123', 4),
    });
    adminToken = (await http.post('/api/auth/login').send({ email: 'admin@test.local', password: 'Admin@123' })).body.accessToken;

    categoryId = (await http.post('/api/categories').set(auth(adminToken)).send({ name: 'Rice & Grains' })).body.id;
    const mk = (sku: string, name: string, price: number, stock: number) =>
      http.post('/api/products').set(auth(adminToken))
        .send({ sku, name, price, unit: '1 kg', categoryId, stock, reorderLevel: 5 });
    riceId = (await mk('T-RICE', 'Test Rice', 1000, 5)).body.id;
    teaId = (await mk('T-TEA', 'Test Tea', 600, 50)).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth & RBAC', () => {
    it('registers customers, rejects duplicates and weak passwords', async () => {
      const reg = (email: string, password = 'Passw0rdOk') =>
        http.post('/api/auth/register').send({ email, password, fullName: 'Test Customer' });
      const alice = await reg('alice@test.local');
      expect(alice.status).toBe(201);
      expect(alice.body.user.role).toBe('CUSTOMER');
      expect(alice.body.user).not.toHaveProperty('passwordHash');
      aliceToken = alice.body.accessToken;
      bobToken = (await reg('bob@test.local')).body.accessToken;

      expect((await reg('alice@test.local')).status).toBe(409);
      expect((await reg('weak@test.local', 'short')).status).toBe(400);
    });

    it('cannot self-register as admin (extra fields are rejected)', async () => {
      const res = await http.post('/api/auth/register')
        .send({ email: 'evil@test.local', password: 'Passw0rdOk', fullName: 'Evil', role: 'ADMIN' });
      expect(res.status).toBe(400);
    });

    it('rejects wrong credentials and missing tokens', async () => {
      expect((await http.post('/api/auth/login').send({ email: 'alice@test.local', password: 'nope-nope1' })).status).toBe(401);
      expect((await http.get('/api/orders/my')).status).toBe(401);
    });

    it('keeps the catalogue public but back-office routes staff-only', async () => {
      expect((await http.get('/api/products')).status).toBe(200);
      const body = { sku: 'X-1', name: 'Nope', price: 1, unit: '1', categoryId, stock: 1, reorderLevel: 1 };
      expect((await http.post('/api/products').set(auth(aliceToken)).send(body)).status).toBe(403);
      expect((await http.get('/api/dashboard/summary').set(auth(aliceToken))).status).toBe(403);
      expect((await http.get('/api/dashboard/summary').set(auth(adminToken))).status).toBe(200);
    });
  });

  describe('orders & inventory', () => {
    it('places an order: totals, order number and stock decrement', async () => {
      const res = await order(aliceToken, [{ productId: riceId, quantity: 2 }, { productId: teaId, quantity: 1 }]);
      expect(res.status).toBe(201);
      expect(res.body.orderNumber).toMatch(/^SFC-\d{6}$/);
      expect(res.body.subtotal).toBe(2600);
      expect(res.body.deliveryFee).toBe(350); // below the LKR 5,000 free-delivery threshold
      expect(res.body.total).toBe(2950);
      expect(res.body.status).toBe('PENDING');
      expect(await stockOf(riceId)).toBe(3);
      expect(await stockOf(teaId)).toBe(49);
    });

    it('is atomic: an order that cannot be fulfilled changes nothing', async () => {
      const res = await order(aliceToken, [{ productId: teaId, quantity: 5 }, { productId: riceId, quantity: 4 }]);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Only 3 left of Test Rice/);
      expect(await stockOf(teaId)).toBe(49);
      expect(await stockOf(riceId)).toBe(3);
    });

    it('never oversells under concurrent orders (row locking)', async () => {
      // 3 rice left; two customers each try to buy 2 at the same moment -> exactly one wins
      const [a, b] = await Promise.all([
        order(aliceToken, [{ productId: riceId, quantity: 2 }]),
        order(bobToken, [{ productId: riceId, quantity: 2 }]),
      ]);
      expect([a.status, b.status].sort()).toEqual([201, 400]);
      expect(await stockOf(riceId)).toBe(1);
    });

    it("hides other customers' orders but lets staff see everything", async () => {
      const mine = await http.get('/api/orders/my').set(auth(aliceToken));
      const id = mine.body.items[0].id;
      expect((await http.get(`/api/orders/${id}`).set(auth(aliceToken))).status).toBe(200);
      expect((await http.get(`/api/orders/${id}`).set(auth(bobToken))).status).toBe(404);
      expect((await http.get(`/api/orders/${id}`).set(auth(adminToken))).status).toBe(200);
      expect((await http.get('/api/orders').set(auth(aliceToken))).status).toBe(403);
      expect((await http.get('/api/orders').set(auth(adminToken))).body.total).toBeGreaterThanOrEqual(2);
    });

    it('enforces the status workflow and restocks on cancellation', async () => {
      const placed = await order(bobToken, [{ productId: teaId, quantity: 10 }]);
      expect(placed.status).toBe(201);
      const id = placed.body.id;
      expect(await stockOf(teaId)).toBe(39);

      const setStatus = (status: string) => http.patch(`/api/orders/${id}/status`).set(auth(adminToken)).send({ status });
      expect((await setStatus('DELIVERED')).status).toBe(400); // can't skip steps
      expect((await setStatus('CONFIRMED')).status).toBe(200);
      expect((await http.patch(`/api/orders/${id}/status`).set(auth(bobToken)).send({ status: 'PACKED' })).status).toBe(403);

      const cancelled = await http.post(`/api/orders/${id}/cancel`).set(auth(bobToken));
      expect(cancelled.status).toBe(201);
      expect(cancelled.body.status).toBe('CANCELLED');
      expect(await stockOf(teaId)).toBe(49); // stock returned to the shelf
      expect((await setStatus('PACKED')).status).toBe(400); // terminal state
    });

    it('records manual stock adjustments in the ledger and refuses negative stock', async () => {
      const adjust = (delta: number) =>
        http.post('/api/inventory/adjust').set(auth(adminToken)).send({ productId: riceId, delta, reason: 'PURCHASE', note: 'Supplier delivery' });
      expect((await adjust(24)).body.stock).toBe(25);
      expect((await adjust(-100)).status).toBe(400);
      expect(await stockOf(riceId)).toBe(25);

      const ledger = await http.get(`/api/inventory/movements?productId=${riceId}`).set(auth(adminToken));
      const reasons = ledger.body.items.map((m: any) => m.reason);
      expect(reasons).toEqual(expect.arrayContaining(['PURCHASE', 'SALE']));
      // ledger balance always matches the product's stock
      expect(ledger.body.items[0].balanceAfter).toBe(25);
    });
  });
});
