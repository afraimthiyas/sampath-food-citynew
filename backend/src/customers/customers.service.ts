import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { PaginationQueryDto, paginated } from '../common/pagination';
import { Role } from '../users/role.enum';
import { User } from '../users/user.entity';

export class CustomerQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export class SetActiveDto {
  @IsBoolean() isActive: boolean;
}

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async list(q: CustomerQueryDto) {
    const filter = (qb: ReturnType<Repository<User>['createQueryBuilder']>) => {
      qb.where('u.role = :role', { role: Role.CUSTOMER });
      if (q.search) qb.andWhere('(u.fullName ILIKE :s OR u.email ILIKE :s)', { s: `%${q.search}%` });
      return qb;
    };

    const total = await filter(this.users.createQueryBuilder('u')).getCount();
    const items = await filter(
      this.users
        .createQueryBuilder('u')
        .leftJoin('u.orders', 'o', 'o.status <> :cancelled', { cancelled: 'CANCELLED' })
        .select('u.id', 'id')
        .addSelect('u.fullName', 'fullName')
        .addSelect('u.email', 'email')
        .addSelect('u.phone', 'phone')
        .addSelect('u.isActive', 'isActive')
        .addSelect('u.createdAt', 'createdAt')
        .addSelect('COUNT(o.id)::int', 'orderCount')
        .addSelect('COALESCE(SUM(o.total), 0)::float', 'totalSpent')
        .addSelect('MAX(o.createdAt)', 'lastOrderAt'),
    )
      .groupBy('u.id')
      .orderBy('"totalSpent"', 'DESC')
      .addOrderBy('u.fullName', 'ASC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit)
      .getRawMany();

    return paginated(items, total, q.page, q.limit);
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.users.findOne({ where: { id, role: Role.CUSTOMER } });
    if (!user) throw new NotFoundException('Customer not found');
    user.isActive = isActive;
    await this.users.save(user);
    return { id: user.id, isActive: user.isActive };
  }
}
