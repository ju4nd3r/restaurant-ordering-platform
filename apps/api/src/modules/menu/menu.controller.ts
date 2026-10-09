import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { QueryMenuItemsDto } from './dto/query-menu-items.dto';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('categories')
  @ApiOperation({
    summary: 'Obtener categorías activas con sus platos disponibles (menú público)',
  })
  @ApiQuery({
    name: 'restaurantId',
    required: false,
    description: 'ID del restaurante (opcional, usa el restaurante activo por defecto)',
  })
  @ApiResponse({ status: 200, description: 'Lista de categorías con platos y fotos' })
  async getCategories(@Query('restaurantId') restaurantId?: string) {
    return this.menuService.getCategoriesWithItems(restaurantId);
  }

  @Get('items')
  @ApiOperation({
    summary: 'Buscar y filtrar platos del menú por texto, categoría y etiquetas dietéticas',
  })
  @ApiResponse({ status: 200, description: 'Platos encontrados' })
  async searchItems(@Query() query: QueryMenuItemsDto) {
    return this.menuService.searchMenuItems(query);
  }

  @Get('items/:id')
  @ApiOperation({
    summary: 'Obtener detalle completo de un plato (grupos de opciones, adicionales, fotos)',
  })
  @ApiParam({ name: 'id', description: 'ID del plato' })
  @ApiResponse({ status: 200, description: 'Detalle del plato' })
  @ApiResponse({ status: 404, description: 'Plato no encontrado' })
  async getItemById(@Param('id') id: string) {
    return this.menuService.getMenuItemById(id);
  }
}
