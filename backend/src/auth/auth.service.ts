import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../users/role.enum';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto';

export function publicUser(u: User) {
  return { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role };
}

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    // Public sign-up can only ever create CUSTOMER accounts.
    const user = await this.users.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      role: Role.CUSTOMER,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const ok = user && user.isActive && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) throw new UnauthorizedException('Invalid email or password');
    return this.issueToken(user);
  }

  private issueToken(user: User) {
    const accessToken = this.jwt.sign({ sub: user.id, role: user.role });
    return { accessToken, user: publicUser(user) };
  }
}
