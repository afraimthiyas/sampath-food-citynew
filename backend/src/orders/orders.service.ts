import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuthUser } from '../common/auth-user';
import { Paginated, PaginationQueryDto, paginated } from '../common/pagination';
import { applyStockChange } from '../inventory/inventory.service';
import { StockReason } from '../inventory/stock-movement.entity';
import { Product } from '../products/product.entity';
import { Role } from '../users/role.enum';
import { User } from '../users/user.entity';
import { CreateOrderDto, OrderQueryDto } from './dto';
import { Order, OrderItem, OrderStatus } from './order.entity';
import { computeTotals, formatOrderNumber, round2 } from './pricing';
import { canTransition } from './status-flow';

/** Shape returned by the API: adds the formatted order number and trims customer/product fields. */
export function presentOrder(o: Order) {
  return {
    id: o.id,
    orderNumber: formatOrderNumber(o.orderSeq),
    status: o.status,
    paymentMethod: o.paymentMethod,
    deliveryAddress: o.deliveryAddress,
    deliveryCity: o.deliveryCity,
    phone: o.phone,
    note: o.note,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    customer: o.customer
      ? { id: o.customer.id, fullName: o.customer.fullName, email: o.customer.email, phone: o.customer.phone }
      : undefined,
    items: o.items?.map((i) => ({
      id: i.id,
      productId: i.product?.id,
      productName: i.productName,
      imageUrl: i.product?.imageUrl ?? null,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Place an order atomically: lock the product rows, verify stock, snapshot prices,
   * decrement stock and write ledger entries. Either everything happens or nothing does.
   */
  async create(user: AuthUser, dto: CreateOrderDto) {
    const wanted = new Map<string, number>();
    for (const item of dto.items) wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
    const ids = [...wanted.keys()].sort(); // consistent lock order avoids deadlocks between concurrent orders

    const orderId = await this.dataSource.transaction(async (em) => {
      const products = await em
        .createQueryBuilder(Product, 'p')
        .setLock('pessimistic_write')
        .where('p.id IN (:...ids)', { ids })
        .orderBy('p.id', 'ASC')
        .getMany();
      const byId = new Map(products.map((p) => [p.id, p]));

      const lines = ids.map((id) => {
        const product = byId.get(id);
        const quantity = wanted.get(id)!;
        if (!product || !product.isActive) throw new BadRequestException('One of the products is no longer available');
        if (product.stock < quantity) {
          throw new BadRequestException(
            product.stock === 0 ? `${product.name} is out of stock` : `Only ${product.stock} left of ${product.name}`,
          );
        }
        return { product, quantity, unitPrice: product.price, lineTotal: round2(product.price * quantity) };
      });

      const totals = computeTotals(lines);
      const saved = await em.save(
        em.create(Order, {
          customer: { id: user.id } as User,
          status: OrderStatus.PENDING,
          paymentMethod: dto.paymentMethod,
          deliveryAddress: dto.deliveryAddress,
          deliveryCity: dto.deliveryCity,
          phone: dto.phone,
          note: dto.note ?? null,
          ...totals,
        }),
      );
      const fresh = await em.findOneOrFail(Order, { where: { id: saved.id } }); // loads the generated orderSeq

      await em.insert(
        OrderItem,
        lines.map((l) => ({
          order: { id: fresh.id } as Order,
          product: { id: l.product.id } as Product,
          productName: l.product.name,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })),
      );
      for (const l of lines) {
        await applyStockChange(em, l.product, -l.quantity, StockReason.SALE, {
          note: `Order ${formatOrderNumber(fresh.orderSeq)}`,
          userId: user.id,
        });
      }
      return fresh.id;
    });

    return this.findOneFor(user, orderId);
  }

  async findOneFor(user: AuthUser, id: string) {
    const order = await this.orders.findOne({
      where: { id },
      relations: { customer: true, items: { product: true } },
      order: { items: { productName: 'ASC' } },
    });
    // Customers only ever see their own orders; a 404 avoids leaking that someone else's id exists.
    if (!order || (user.role === Role.CUSTOMER && order.customer.id !== user.id)) {
      throw new NotFoundException('Order not found');
    }
    return presentOrder(order);
  }

  async mine(user: AuthUser, q: PaginationQueryDto): Promise<Paginated<ReturnType<typeof presentOrder>>> {
    const [items, total] = await this.orders.findAndCount({
      where: { customer: { id: user.id } },
      relations: { items: { product: true } },
      order: { createdAt: 'DESC' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });
    return paginated(items.map(presentOrder), total, q.page, q.limit);
  }

  async list(q: OrderQueryDto) {
    const qb = this.orders.createQueryBuilder('o').leftJoinAndSelect('o.customer', 'c').orderBy('o.createdAt', 'DESC');
    if (q.status) qb.andWhere('o.status = :status', { status: q.status });
    if (q.search) {
      const digits = q.search.replace(/\D/g, '');
      qb.andWhere(
        digits
          ? '(c.fullName ILIKE :q OR c.email ILIKE :q OR CAST(o.orderSeq AS TEXT) LIKE :n)'
          : '(c.fullName ILIKE :q OR c.email ILIKE :q)',
        { q: `%${q.search}%`, n: `%${digits.replace(/^0+/, '')}%` },
      );
    }
    const [rows, total] = await qb.skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    const ids = rows.map((r) => r.id);
    const withItems = ids.length
      ? await this.orders.find({ where: rows.map((r) => ({ id: r.id })), relations: { items: { product: true } } })
      : [];
    const itemsById = new Map(withItems.map((o) => [o.id, o.items]));
    rows.forEach((r) => (r.items = itemsById.get(r.id) ?? []));
    return paginated(rows.map(presentOrder), total, q.page, q.limit);
  }

  /** Staff-driven lifecycle change. Cancelling puts the stock back on the shelf. */
  async updateStatus(id: string, next: OrderStatus, actor: AuthUser) {
    await this.dataSource.transaction((em) => this.transition(em, id, next, actor));
    return this.findOneFor(actor, id);
  }

  /** Customers may cancel their own order until it has been packed. */
  async cancelMine(user: AuthUser, id: string) {
    const order = await this.orders.findOne({ where: { id }, relations: { customer: true } });
    if (!order || order.customer.id !== user.id) throw new NotFoundException('Order not found');
    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new BadRequestException('This order is already being prepared and can no longer be cancelled online');
    }
    await this.dataSource.transaction((em) => this.transition(em, id, OrderStatus.CANCELLED, user));
    return this.findOneFor(user, id);
  }

  private async transition(em: EntityManager, id: string, next: OrderStatus, actor: AuthUser) {
    const order = await em
      .createQueryBuilder(Order, 'o')
      .setLock('pessimistic_write')
      .where('o.id = :id', { id })
      .getOne();
    if (!order) throw new NotFoundException('Order not found');
    if (!canTransition(order.status, next)) {
      throw new BadRequestException(`Cannot move an order from ${order.status} to ${next}`);
    }

    if (next === OrderStatus.CANCELLED) {
      const items = await em.find(OrderItem, { where: { order: { id } }, relations: { product: true } });
      const productIds = items.map((i) => i.product.id).sort();
      const products = await em
        .createQueryBuilder(Product, 'p')
        .setLock('pessimistic_write')
        .where('p.id IN (:...ids)', { ids: productIds })
        .orderBy('p.id', 'ASC')
        .getMany();
      const byId = new Map(products.map((p) => [p.id, p]));
      for (const item of items) {
        await applyStockChange(em, byId.get(item.product.id)!, item.quantity, StockReason.CANCELLATION, {
          note: `Cancelled ${formatOrderNumber(order.orderSeq)}`,
          userId: actor.id,
        });
      }
    }
    await em.update(Order, id, { status: next });
  }
}
