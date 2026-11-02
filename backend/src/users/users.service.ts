import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  /** Includes the password hash - only for credential checks. */
  findByEmailWithPassword(email: string) {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  existsByEmail(email: string) {
    return this.users.exists({ where: { email: email.toLowerCase() } });
  }

  create(data: Partial<User>) {
    return this.users.save(this.users.create({ ...data, email: data.email?.toLowerCase() }));
  }
}
