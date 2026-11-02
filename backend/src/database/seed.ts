/**
 * Demo data seeder.
 *   npm run seed            -> migrate + seed (skips if already seeded)
 *   npm run seed -- --reset -> wipe all data first
 *
 * Creates staff + customer accounts, the product catalogue, and ~2 weeks of realistic
 * order history (with a consistent stock ledger) so the dashboard has something to show.
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { Category } from '../categories/category.entity';
import { StockMovement, StockReason } from '../inventory/stock-movement.entity';
import { Order, OrderItem, OrderStatus, PaymentMethod } from '../orders/order.entity';
import { computeTotals, formatOrderNumber } from '../orders/pricing';
import { Product } from '../products/product.entity';
import { Role } from '../users/role.enum';
import { User } from '../users/user.entity';
import catalog from './catalog.json';
import { buildDataSourceOptions } from './data-source-options';

export const imageFor = (name: string) =>
  `/products/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.svg`;

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@sampathfoodcity.demo', password: 'Admin@123' },
  manager: { email: 'manager@sampathfoodcity.demo', password: 'Manager@123' },
  customer: { email: 'customer@sampathfoodcity.demo', password: 'Customer@123' },
};

/** Small deterministic PRNG so every seed run produces the same history. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CUSTOMERS = [
  ['Nimali Perera', 'customer@sampathfoodcity.demo'],
  ['Dilshan Silva', 'dilshan.silva@example.com'],
  ['Ayesha Fernando', 'ayesha.fernando@example.com'],
  ['Ruwan Jayasuriya', 'ruwan.j@example.com'],
  ['Tharushi Wickramasinghe', 'tharushi.w@example.com'],
  ['Mohamed Rizwan', 'm.rizwan@example.com'],
  ['Sanduni Gunasekara', 'sanduni.g@example.com'],
  ['Kavindu Rajapaksa', 'kavindu.r@example.com'],
  ['Priya Nadarajah', 'priya.n@example.com'],
];

const ADDRESSES: [string, string][] = [
  ['12/A Galle Road, Dehiwala', 'Dehiwala'],
  ['45 Temple Road, Nugegoda', 'Nugegoda'],
  ['8 Havelock Place, Colombo 05', 'Colombo'],
  ['221 High Level Road, Maharagama', 'Maharagama'],
  ['17 Lake Drive, Rajagiriya', 'Rajagiriya'],
  ['63 Station Road, Mount Lavinia', 'Mount Lavinia'],
  ['9 Kandy Road, Kadawatha', 'Kadawatha'],
  ['30 Baseline Road, Colombo 09', 'Colombo'],
];

async function main() {
  const ds = new DataSource(
    buildDataSourceOptions(process.env.DATABASE_URL ?? 'postgres://sfc:sfc_password@localhost:5432/sampath_food_city'),
  );
  await ds.initialize();
  await ds.runMigrations();

  if (process.argv.includes('--reset')) {
    await ds.query('TRUNCATE TABLE stock_movements, order_items, orders, products, categories, users RESTART IDENTITY CASCADE');
    console.log('Existing data wiped.');
  } else if (await ds.getRepository(User).exists({ where: { email: DEMO_ACCOUNTS.admin.email } })) {
    console.log('Database already seeded (use `npm run seed -- --reset` to start over).');
    await ds.destroy();
    return;
  }

  const rand = mulberry32(20261101);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const now = new Date();
  const DAY = 86_400_000;

  await ds.transaction(async (em) => {
    // ---- users ----
    const staffHash = {
      admin: await bcrypt.hash(DEMO_ACCOUNTS.admin.password, 10),
      manager: await bcrypt.hash(DEMO_ACCOUNTS.manager.password, 10),
    };
    const customerHash = await bcrypt.hash(DEMO_ACCOUNTS.customer.password, 10);
    await em.insert(User, [
      { email: DEMO_ACCOUNTS.admin.email, fullName: 'Store Admin', role: Role.ADMIN, passwordHash: staffHash.admin, phone: '0112345678' },
      { email: DEMO_ACCOUNTS.manager.email, fullName: 'Kasun Fernando', role: Role.MANAGER, passwordHash: staffHash.manager, phone: '0112345679' },
      ...CUSTOMERS.map(([fullName, email], i) => ({
        email, fullName, role: Role.CUSTOMER, passwordHash: customerHash,
        phone: `07${[1, 2, 5, 6, 7, 8][i % 6]}${String(1000000 + Math.floor(rand() * 8999999))}`,
        createdAt: new Date(now.getTime() - (20 + i) * DAY),
      })),
    ]);
    const admin = await em.findOneByOrFail(User, { email: DEMO_ACCOUNTS.admin.email });
    const customers = await em.find(User, { where: { role: Role.CUSTOMER } });

    // ---- catalogue ----
    const categories = await em.save(
      Category,
      catalog.categories.map((c) => em.create(Category, { name: c.name, slug: c.slug, description: c.description })),
    );
    const catBySlug = new Map(categories.map((c) => [c.slug, c]));

    // Generate order history first so we know how much each product sold, then derive opening stock
    // such that (opening stock - net sales) == the stock level defined in the catalogue.
    type Line = { productIdx: number; qty: number };
    type Draft = { id: string; customer: User; createdAt: Date; status: OrderStatus; lines: Line[]; address: [string, string] };
    const drafts: Draft[] = [];
    for (let d = 13; d >= 0; d--) {
      const perDay = d === 0 ? 5 : 3 + Math.floor(rand() * 5);
      for (let k = 0; k < perDay; k++) {
        const createdAt = new Date(now.getTime() - d * DAY);
        createdAt.setHours(8 + Math.floor(rand() * 12), Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
        if (createdAt > now) createdAt.setTime(now.getTime() - 60_000 * (k + 1));
        let status: OrderStatus;
        const r = rand();
        if (d >= 3) status = r < 0.92 ? OrderStatus.DELIVERED : OrderStatus.CANCELLED;
        else if (d >= 1) status = r < 0.55 ? OrderStatus.DELIVERED : r < 0.8 ? OrderStatus.OUT_FOR_DELIVERY : r < 0.93 ? OrderStatus.PACKED : OrderStatus.CANCELLED;
        else status = r < 0.4 ? OrderStatus.PENDING : r < 0.75 ? OrderStatus.CONFIRMED : OrderStatus.PACKED;

        const used = new Set<number>();
        const lines: Line[] = [];
        const n = 2 + Math.floor(rand() * 5);
        while (lines.length < n) {
          const idx = Math.floor(rand() * catalog.products.length);
          if (used.has(idx)) continue;
          used.add(idx);
          lines.push({ productIdx: idx, qty: 1 + Math.floor(rand() * 3) });
        }
        drafts.push({ id: randomUUID(), customer: pick(customers), createdAt, status, lines, address: pick(ADDRESSES) });
      }
    }
    drafts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const netSold = new Array(catalog.products.length).fill(0);
    drafts.forEach((o) => o.status !== OrderStatus.CANCELLED && o.lines.forEach((l) => (netSold[l.productIdx] += l.qty)));

    const openedAt = new Date(now.getTime() - 15 * DAY);
    const productRows = catalog.products.map((p, i) =>
      em.create(Product, {
        sku: p.sku, name: p.name, description: p.description, price: p.price, unit: p.unit,
        imageUrl: imageFor(p.name), stock: p.stock, reorderLevel: p.reorderLevel, isActive: true,
        category: catBySlug.get(p.category)!, createdAt: new Date(openedAt.getTime() + i * 1000),
      }),
    );
    const products = await em.save(Product, productRows);

    // ---- ledger + orders ----
    const balance = products.map((p, i) => p.stock + netSold[i]); // opening stock
    const movements: Partial<StockMovement>[] = products.map((p, i) => ({
      product: { id: p.id } as Product, delta: balance[i], balanceAfter: balance[i],
      reason: StockReason.PURCHASE, note: 'Opening stock', createdBy: { id: admin.id } as User, createdAt: openedAt,
    }));

    const orderRows: Partial<Order>[] = [];
    const itemRows: Partial<OrderItem>[] = [];
    const orderSeqPreview = new Map<string, number>();
    drafts.forEach((o, idx) => {
      orderSeqPreview.set(o.id, idx + 1); // inserted in chronological order -> serial follows
      const priced = o.lines.map((l) => ({ ...l, unitPrice: products[l.productIdx].price }));
      const totals = computeTotals(priced.map((l) => ({ unitPrice: l.unitPrice, quantity: l.qty })));
      orderRows.push({
        id: o.id, customer: { id: o.customer.id } as User, status: o.status,
        paymentMethod: rand() < 0.7 ? PaymentMethod.CASH_ON_DELIVERY : PaymentMethod.CARD,
        deliveryAddress: o.address[0], deliveryCity: o.address[1], phone: o.customer.phone ?? '0771234567',
        note: null, ...totals, createdAt: o.createdAt, updatedAt: o.createdAt,
      });
      const label = formatOrderNumber(idx + 1);
      priced.forEach((l, li) => {
        const p = products[l.productIdx];
        itemRows.push({
          order: { id: o.id } as Order, product: { id: p.id } as Product, productName: p.name,
          unitPrice: l.unitPrice, quantity: l.qty, lineTotal: Math.round(l.unitPrice * l.qty * 100) / 100,
        });
        const at = new Date(o.createdAt.getTime() + li * 1000);
        balance[l.productIdx] -= l.qty;
        movements.push({
          product: { id: p.id } as Product, delta: -l.qty, balanceAfter: balance[l.productIdx],
          reason: StockReason.SALE, note: `Order ${label}`, createdBy: { id: o.customer.id } as User, createdAt: at,
        });
        if (o.status === OrderStatus.CANCELLED) {
          balance[l.productIdx] += l.qty;
          movements.push({
            product: { id: p.id } as Product, delta: l.qty, balanceAfter: balance[l.productIdx],
            reason: StockReason.CANCELLATION, note: `Cancelled ${label}`, createdBy: { id: admin.id } as User,
            createdAt: new Date(at.getTime() + 3_600_000),
          });
        }
      });
    });

    await em.insert(Order, orderRows as any);
    await em.insert(OrderItem, itemRows as any);
    await em.insert(StockMovement, movements as any);

    // The last balance of every product must equal the catalogue stock we promised.
    products.forEach((p, i) => {
      if (balance[i] !== p.stock) throw new Error(`Ledger mismatch for ${p.name}: ${balance[i]} != ${p.stock}`);
    });
    console.log(`Seeded ${products.length} products, ${categories.length} categories, ${customers.length} customers, ${orderRows.length} orders.`);
  });

  console.log('\nDemo logins:');
  Object.entries(DEMO_ACCOUNTS).forEach(([role, a]) => console.log(`  ${role.padEnd(9)} ${a.email}  /  ${a.password}`));
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
