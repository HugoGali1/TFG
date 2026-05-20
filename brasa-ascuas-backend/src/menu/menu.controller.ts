import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // --- Categories ---

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear categoría (admin)' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías activas' })
  findAllCategories() {
    return this.menuService.findAllCategories();
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar categoría' })
  removeCategory(@Param('id') id: string) {
    return this.menuService.removeCategory(id);
  }

  // --- Items ---

  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear plato (admin)' })
  createItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createItem(dto);
  }

  @Get('items')
  @ApiOperation({ summary: 'Listar platos disponibles (con filtros opcionales)' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'isVegetarian', required: false, type: Boolean })
  @ApiQuery({ name: 'isGlutenFree', required: false, type: Boolean })
  @ApiQuery({ name: 'isSpicy', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'all', required: false, type: Boolean, description: 'Admin: incluir platos no disponibles' })
  findAllItems(
    @Query('categoryId') categoryId?: string,
    @Query('isVegetarian') isVegetarian?: string,
    @Query('isGlutenFree') isGlutenFree?: string,
    @Query('isSpicy') isSpicy?: string,
    @Query('search') search?: string,
    @Query('all') all?: string,
  ) {
    return this.menuService.findAllItems({
      categoryId,
      isVegetarian: isVegetarian === 'true',
      isGlutenFree: isGlutenFree === 'true',
      isSpicy: isSpicy === 'true',
      search,
      includeAll: all === 'true',
    });
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Obtener plato por ID' })
  findItem(@Param('id') id: string) {
    return this.menuService.findItemById(id);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar plato (admin)' })
  updateItem(@Param('id') id: string, @Body() dto: Partial<CreateMenuItemDto>) {
    return this.menuService.updateItem(id, dto);
  }

  @Patch('items/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.KITCHEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activar / desactivar disponibilidad de un plato' })
  toggleItem(@Param('id') id: string) {
    return this.menuService.toggleAvailability(id);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar plato (admin)' })
  removeItem(@Param('id') id: string) {
    return this.menuService.removeItem(id);
  }
}
