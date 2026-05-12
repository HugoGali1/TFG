import { Body, Controller, Delete, Get, Param, Post, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { TableStatus } from './schemas/table.schema';

@ApiTags('tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear mesa (admin)' })
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todas las mesas' })
  findAll() {
    return this.tablesService.findAll();
  }

  @Get('qr/:qrCode')
  @ApiOperation({ summary: 'Obtener mesa por QR (cliente)' })
  findByQr(@Param('qrCode') qrCode: string) {
    return this.tablesService.findByQrCode(qrCode);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mesa por ID' })
  findOne(@Param('id') id: string) {
    return this.tablesService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar estado de mesa' })
  updateStatus(@Param('id') id: string, @Body('status') status: TableStatus) {
    return this.tablesService.updateStatus(id, status);
  }

  @Patch(':id/regenerate-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerar código QR de una mesa' })
  regenerateQr(@Param('id') id: string) {
    return this.tablesService.regenerateQr(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar mesa' })
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}
