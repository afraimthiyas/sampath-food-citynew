import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { Category } from './category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  /** Categories with the number of active products in each (used by the storefront). */
  async findAll() {
    const rows = await this.categories
      .createQueryBuilder('c')
      .leftJoin('c.products', 'p', 'p.isActive = true')
      .select(['c.id AS id', 'c.name AS name', 'c.slug AS slug', 'c.description AS description'])
      .addSelect('COUNT(p.id)::int', 'productCount')
      .groupBy('c.id')
      .orderBy('c.name', 'ASC')
      .getRawMany();
    return rows;
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);
    if (await this.categories.exists({ where: [{ name: dto.name }, { slug }] })) {
      throw new ConflictException('A category with this name already exists');
    }
    return this.categories.save(this.categories.create({ ...dto, slug, description: dto.description ?? null }));
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (dto.name && dto.name !== category.name) {
      category.name = dto.name;
      category.slug = slugify(dto.name);
    }
    if (dto.description !== undefined) category.description = dto.description;
    return this.categories.save(category);
  }

  async remove(id: string) {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (await this.products.exists({ where: { category: { id } } })) {
      throw new ConflictException('Cannot delete a category that still has products');
    }
    await this.categories.remove(category);
  }
}
