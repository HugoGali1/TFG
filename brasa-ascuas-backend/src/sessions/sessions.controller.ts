import { Body, Controller, Get, Param, Post, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { ChooseBuffetDto } from './dto/choose-buffet.dto';
import { FromQrDto } from './dto/from-qr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Abrir sesión en una mesa (camarero / admin)' })
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar sesiones activas (panel cocina/camarero)' })
  findActive() {
    return this.sessionsService.findActive();
  }

  @Get('token/:token')
  @ApiOperation({ summary: 'Obtener sesión por token QR (cliente)' })
  findByToken(@Param('token') token: string) {
    return this.sessionsService.findByToken(token);
  }

  @Get('active-by-table/:qrCode')
  @ApiOperation({ summary: 'Sesión activa asociada al QR de una mesa (cliente)' })
  findActiveByTableQr(@Param('qrCode') qrCode: string) {
    return this.sessionsService.findActiveByTableQr(qrCode);
  }

  @Post('from-qr')
  @ApiOperation({ summary: 'Auto-crear sesión escaneando el QR de la mesa (cliente)' })
  createFromQr(@Body() dto: FromQrDto) {
    return this.sessionsService.createFromQr(dto.qrCode, dto.partySize);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener sesión por ID' })
  findOne(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }

  @Post('reset-table/:tableId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Demo/dev: cerrar sesión activa y liberar mesa (admin)' })
  resetTable(@Param('tableId') tableId: string) {
    return this.sessionsService.resetTable(tableId);
  }

  @Patch(':id/buffet')
  @ApiOperation({ summary: 'Elegir buffet para la sesión (cliente)' })
  chooseBuffet(@Param('id') id: string, @Body() dto: ChooseBuffetDto) {
    return this.sessionsService.chooseBuffet(id, dto.buffetId);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión de mesa' })
  close(@Param('id') id: string) {
    return this.sessionsService.close(id);
  }
}
