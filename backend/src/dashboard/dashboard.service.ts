import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { formatOrderNumber } from '../orders/pricing';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async summary() {
    const [[orders], [counts], revenueByDay, ordersByStatus, topProducts, salesByCategory, recent, lowStock] =
      await Promise.all([
        this.ds.query(`
          SELECT COALESCE(SUM(total) FILTER (WHERE status <> 'CANCELLED'), 0)::float AS revenue,
                 COUNT(*)::int AS "totalOrders",
                 COUNT(*) FILTER (WHERE status = 'PENDING')::int AS "pendingOrders",
                 COALESCE(AVG(total) FILTER (WHERE status <> 'CANCELLED'), 0)::float AS "averageOrderValue"
          FROM orders`),
        this.ds.query(`
          SELECT (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER')::int AS customers,
                 (SELECT COUNT(*) FROM products WHERE "isActive")::int AS products,
                 (SELECT COUNT(*) FROM products WHERE "isActive" AND stock <= "reorderLevel")::int AS "lowStock"`),
        this.ds.query(`
          SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
                 COALESCE(SUM(o.total), 0)::float AS revenue,
                 COUNT(o.id)::int AS orders
          FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
          LEFT JOIN orders o ON o."createdAt"::date = d::date AND o.status <> 'CANCELLED'
          GROUP BY d ORDER BY d`),
        this.ds.query(`SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`),
        this.ds.query(`
          SELECT p.id, p.name, p."imageUrl", SUM(oi.quantity)::int AS quantity, SUM(oi."lineTotal")::float AS revenue
          FROM order_items oi
          JOIN orders o ON o.id = oi."orderId" AND o.status <> 'CANCELLED'
          JOIN products p ON p.id = oi."productId"
          GROUP BY p.id ORDER BY quantity DESC, p.name LIMIT 5`),
        this.ds.query(`
          SELECT c.name, SUM(oi."lineTotal")::float AS revenue
          FROM order_items oi
          JOIN orders o ON o.id = oi."orderId" AND o.status <> 'CANCELLED'
          JOIN products p ON p.id = oi."productId"
          JOIN categories c ON c.id = p."categoryId"
          GROUP BY c.name ORDER BY revenue DESC`),
        this.ds.query(`
          SELECT o.id, o."orderSeq", o.status, o.total::float AS total, o."createdAt", u."fullName" AS customer
          FROM orders o JOIN users u ON u.id = o."customerId"
          ORDER BY o."createdAt" DESC LIMIT 6`),
        this.ds.query(`
          SELECT id, name, "imageUrl", stock, "reorderLevel"
          FROM products WHERE "isActive" AND stock <= "reorderLevel"
          ORDER BY stock ASC, name LIMIT 6`),
      ]);

    return {
      totals: { ...orders, ...counts },
      revenueByDay,
      ordersByStatus,
      topProducts,
      salesByCategory,
      recentOrders: recent.map(({ orderSeq, ...o }: any) => ({ ...o, orderNumber: formatOrderNumber(orderSeq) })),
      lowStock,
    };
  }
}
