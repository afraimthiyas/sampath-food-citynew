import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, STAFF } from '../common/decorators';
import { Role } from '../users/role.enum';
import { CustomerQueryDto, CustomersService, SetActiveDto } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Roles(...STAFF)
  @Get()
  list(@Query() q: CustomerQueryDto) {
    return this.customers.list(q);
  }

  /** Account suspension is an ADMIN-only action (managers can view but not suspend). */
  @Roles(Role.ADMIN)
  @Patch(':id/active')
  setActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetActiveDto) {
    return this.customers.setActive(id, dto.isActive);
  }
}
