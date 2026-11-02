import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Paginated, paginated } from '../common/pagination';
import { Category } from '../categories/category.entity';
import { StockMovement, StockReason } from '../inventory/stock-movement.entity';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async search(query: ProductQueryDto, opts: { includeInactive: boolean }): Promise<Paginated<Product>> {
    const { page, limit, search, categoryId, sort, inStock } = query;
    const qb = this.products.createQueryBuilder('p').leftJoinAndSelect('p.category', 'category');

    if (!opts.includeInactive) qb.andWhere('p.isActive = true');
    if (search) qb.andWhere('(p.name ILIKE :q OR p.sku ILIKE :q)', { q: `%${search}%` });
    if (categoryId) qb.andWhere('category.id = :categoryId', { categoryId });
    if (inStock) qb.andWhere('p.stock > 0');

    switch (sort) {
      case 'price_asc': qb.orderBy('p.price', 'ASC'); break;
      case 'price_desc': qb.orderBy('p.price', 'DESC'); break;
      case 'name': qb.orderBy('p.name', 'ASC'); break;
      default: qb.orderBy('p.createdAt', 'DESC').addOrderBy('p.name', 'ASC');
    }

    const [items, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginated(items, total, page, limit);
  }

  async findOne(id: string, opts: { includeInactive: boolean } = { includeInactive: false }) {
    const product = await this.products.findOne({ where: { id } });
    if (!product || (!product.isActive && !opts.includeInactive)) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto, userId: string) {
    if (await this.products.exists({ where: { sku: dto.sku } })) {
      throw new ConflictException(`SKU ${dto.sku} is already in use`);
    }
    const category = await this.categories.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    return this.dataSource.transaction(async (em) => {
      const product = await em.save(
        em.create(Product, {
          sku: dto.sku, name: dto.name, description: dto.description ?? null, price: dto.price,
          unit: dto.unit, imageUrl: dto.imageUrl ?? null, stock: dto.stock, reorderLevel: dto.reorderLevel,
          isActive: dto.isActive ?? true, category,
        }),
      );
      if (dto.stock > 0) {
        await em.save(
          em.create(StockMovement, {
            product, delta: dto.stock, balanceAfter: dto.stock, reason: StockReason.PURCHASE,
            note: 'Opening stock', createdBy: { id: userId } as any,
          }),
        );
      }
      return product;
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id, { includeInactive: true });
    if (dto.sku && dto.sku !== product.sku && (await this.products.exists({ where: { sku: dto.sku } }))) {
      throw new ConflictException(`SKU ${dto.sku} is already in use`);
    }
    if (dto.categoryId) {
      const category = await this.categories.findOne({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('Category not found');
      product.category = category;
    }
    const { categoryId: _ignored, ...rest } = dto;
    Object.assign(product, rest);
    return this.products.save(product);
  }

  /** Products referenced by past orders must stay in the database, so "delete" archives them. */
  async archive(id: string) {
    const product = await this.findOne(id, { includeInactive: true });
    product.isActive = false;
    await this.products.save(product);
  }
}
