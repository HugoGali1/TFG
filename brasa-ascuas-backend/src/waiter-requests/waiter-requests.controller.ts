import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WaiterRequestsService } from './waiter-requests.service';
import { CreateWaiterRequestDto } from './dto/create-waiter-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('waiter-requests')
@Controller('waiter-requests')
export class WaiterRequestsController {
  constructor(private readonly service: WaiterRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Solicitar asistencia del camarero (cliente)' })
  create(@Body() dto: CreateWaiterRequestDto) {
    return this.service.create(dto);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver solicitudes pendientes (camarero/cocina)' })
  findPending() {
    return this.service.findPending();
  }

  @Patch(':id/acknowledge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirmar recepción de solicitud' })
  acknowledge(@Param('id') id: string) {
    return this.service.acknowledge(id);
  }

  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar solicitud como resuelta' })
  resolve(@Param('id') id: string) {
    return this.service.resolve(id);
  }
}
