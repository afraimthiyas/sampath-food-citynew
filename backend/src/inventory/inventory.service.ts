import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Paginated, paginated } from '../common/pagination';
import { Product } from '../products/product.entity';
import { AdjustStockDto, MovementQueryDto } from './dto';
import { StockMovement, StockReason } from './stock-movement.entity';

/**
 * Apply a stock change inside an existing transaction and write the ledger row.
 * The caller must already hold a row lock on `product` (see OrdersService / adjust()).
 */
export async function applyStockChange(
  em: EntityManager,
  product: Product,
  delta: number,
  reason: StockReason,
  opts: { note?: string; userId?: string } = {},
) {
  const next = product.stock + delta;
  if (next < 0) throw new BadRequestException(`Not enough stock for ${product.name} (have ${product.stock})`);
  product.stock = next;
  await em.update(Product, product.id, { stock: next });
  await em.insert(StockMovement, {
    product: { id: product.id } as Product,
    delta,
    balanceAfter: next,
    reason,
    note: opts.note ?? null,
    createdBy: opts.userId ? ({ id: opts.userId } as any) : null,
  });
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(StockMovement) private readonly movements: Repository<StockMovement>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  lowStock() {
    return this.products
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .where('p.isActive = true AND p.stock <= p.reorderLevel')
      .orderBy('p.stock', 'ASC')
      .addOrderBy('p.name', 'ASC')
      .getMany();
  }

  async adjust(dto: AdjustStockDto, userId: string) {
    if (dto.reason === StockReason.SALE || dto.reason === StockReason.CANCELLATION) {
      throw new BadRequestException('SALE and CANCELLATION movements are created by the order workflow');
    }
    return this.dataSource.transaction(async (em) => {
      const product = await em
        .createQueryBuilder(Product, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id: dto.productId })
        .getOne();
      if (!product) throw new NotFoundException('Product not found');
      await applyStockChange(em, product, dto.delta, dto.reason, { note: dto.note, userId });
      return { productId: product.id, name: product.name, stock: product.stock };
    });
  }

  async history(q: MovementQueryDto): Promise<Paginated<StockMovement>> {
    const qb = this.movements
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.product', 'product')
      .leftJoinAndSelect('m.createdBy', 'createdBy')
      .orderBy('m.createdAt', 'DESC');
    if (q.productId) qb.where('product.id = :pid', { pid: q.productId });
    const [items, total] = await qb.skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return paginated(
      items.map((m) => ({ ...m, createdBy: m.createdBy ? ({ id: m.createdBy.id, fullName: m.createdBy.fullName } as any) : null })),
      total, q.page, q.limit,
    );
  }
}
