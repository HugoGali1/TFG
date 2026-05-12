import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BuffetService } from './buffet.service';
import { CreateBuffetDto } from './dto/create-buffet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('buffets')
@Controller('buffets')
export class BuffetController {
  constructor(private readonly buffetService: BuffetService) {}

  @Get()
  @ApiOperation({ summary: 'Listar buffets disponibles (cliente)' })
  findAll() {
    return this.buffetService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener buffet por ID' })
  findOne(@Param('id') id: string) {
    return this.buffetService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear buffet (admin)' })
  create(@Body() dto: CreateBuffetDto) {
    return this.buffetService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar buffet (admin)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateBuffetDto>) {
    return this.buffetService.update(id, dto);
  }
}
