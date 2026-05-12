import { Body, Controller, Get, Param, Post, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { OrderStatus } from './enums/order-status.enum';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear pedido (cliente)' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.KITCHEN, Role.WAITER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pedidos activos (panel cocina)' })
  findActive() {
    return this.ordersService.findActive();
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Historial de pedidos de una sesión (cliente)' })
  findBySession(@Param('sessionId') sessionId: string) {
    return this.ordersService.findBySession(sessionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pedido por ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.KITCHEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar estado de un pedido completo (cocina)' })
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateOrderStatus(id, status);
  }

  @Patch('item-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.KITCHEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar estado de un item concreto (cocina)' })
  updateItemStatus(@Body() dto: UpdateItemStatusDto) {
    return this.ordersService.updateItemStatus(dto.orderId, dto.itemIndex, dto.status);
  }
}
