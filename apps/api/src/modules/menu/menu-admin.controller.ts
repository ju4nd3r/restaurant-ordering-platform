import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MenuService } from './menu.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  ToggleAvailabilityDto,
} from './dto/menu-item.dto';
import {
  CreateOptionGroupDto,
  UpdateOptionGroupDto,
  CreateOptionDto,
  UpdateOptionDto,
} from './dto/option-group.dto';
import { CreateModifierDto, UpdateModifierDto } from './dto/modifier.dto';
import { ReorderImagesDto } from './dto/image.dto';

@ApiTags('Admin - Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('menu/admin')
export class MenuAdminController {
  constructor(private readonly menuService: MenuService) {}

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  @Get('categories')
  @ApiOperation({ summary: 'Listar todas las categorías con conteo de platos (Admin)' })
  async getAllCategories(@CurrentUser() user: { restaurantId: string }) {
    return this.menuService.getAllCategoriesAdmin(user.restaurantId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Crear nueva categoría de menú (Admin)' })
  @ApiResponse({ status: 201, description: 'Categoría creada' })
  async createCategory(
    @CurrentUser() user: { restaurantId: string },
    @Body() dto: CreateCategoryDto,
  ) {
    return this.menuService.createCategory(user.restaurantId, dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Actualizar categoría existente (Admin)' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.menuService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Eliminar categoría vacía (Admin)' })
  async deleteCategory(@Param('id') id: string) {
    return this.menuService.deleteCategory(id);
  }

  // ============================================================================
  // MENU ITEMS
  // ============================================================================

  @Post('items')
  @ApiOperation({ summary: 'Crear nuevo plato en el menú (Admin)' })
  @ApiResponse({ status: 201, description: 'Plato creado exitosamente' })
  async createMenuItem(
    @CurrentUser() user: { restaurantId: string },
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuService.createMenuItem(user.restaurantId, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Actualizar información del plato (Admin)' })
  async updateMenuItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuService.updateMenuItem(id, dto);
  }

  @Patch('items/:id/availability')
  @ApiOperation({ summary: 'Cambio rápido de disponibilidad del plato (Admin)' })
  async toggleAvailability(@Param('id') id: string, @Body() dto: ToggleAvailabilityDto) {
    return this.menuService.toggleAvailability(id, dto.isAvailable);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Eliminar plato y sus fotos asociadas (Admin)' })
  async deleteMenuItem(@Param('id') id: string) {
    return this.menuService.deleteMenuItem(id);
  }

  // ============================================================================
  // OPTION GROUPS & OPTIONS
  // ============================================================================

  @Post('items/:itemId/option-groups')
  @ApiOperation({ summary: 'Agregar grupo de opciones a un plato (Admin)' })
  async createOptionGroup(
    @Param('itemId') itemId: string,
    @Body() dto: CreateOptionGroupDto,
  ) {
    return this.menuService.createOptionGroup(itemId, dto);
  }

  @Patch('option-groups/:id')
  @ApiOperation({ summary: 'Actualizar grupo de opciones (Admin)' })
  async updateOptionGroup(@Param('id') id: string, @Body() dto: UpdateOptionGroupDto) {
    return this.menuService.updateOptionGroup(id, dto);
  }

  @Delete('option-groups/:id')
  @ApiOperation({ summary: 'Eliminar grupo de opciones (Admin)' })
  async deleteOptionGroup(@Param('id') id: string) {
    return this.menuService.deleteOptionGroup(id);
  }

  @Post('option-groups/:groupId/options')
  @ApiOperation({ summary: 'Agregar opción a un grupo existente (Admin)' })
  async createOption(@Param('groupId') groupId: string, @Body() dto: CreateOptionDto) {
    return this.menuService.createOption(groupId, dto);
  }

  @Patch('options/:id')
  @ApiOperation({ summary: 'Actualizar opción (Admin)' })
  async updateOption(@Param('id') id: string, @Body() dto: UpdateOptionDto) {
    return this.menuService.updateOption(id, dto);
  }

  @Delete('options/:id')
  @ApiOperation({ summary: 'Eliminar opción (Admin)' })
  async deleteOption(@Param('id') id: string) {
    return this.menuService.deleteOption(id);
  }

  // ============================================================================
  // MODIFIERS (EXTRAS)
  // ============================================================================

  @Post('items/:itemId/modifiers')
  @ApiOperation({ summary: 'Agregar extra/adicional a un plato (Admin)' })
  async createModifier(@Param('itemId') itemId: string, @Body() dto: CreateModifierDto) {
    return this.menuService.createModifier(itemId, dto);
  }

  @Patch('modifiers/:id')
  @ApiOperation({ summary: 'Actualizar adicional (Admin)' })
  async updateModifier(@Param('id') id: string, @Body() dto: UpdateModifierDto) {
    return this.menuService.updateModifier(id, dto);
  }

  @Delete('modifiers/:id')
  @ApiOperation({ summary: 'Eliminar adicional (Admin)' })
  async deleteModifier(@Param('id') id: string) {
    return this.menuService.deleteModifier(id);
  }

  // ============================================================================
  // IMAGES & OPTIMIZATION
  // ============================================================================

  @Post('items/:itemId/images')
  @ApiOperation({
    summary: 'Subir y procesar foto de plato (WebP, Thumbnail y Placeholder LQIP)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadItemImage(
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.menuService.uploadItemImage(itemId, file);
  }

  @Delete('images/:id')
  @ApiOperation({ summary: 'Eliminar foto de plato (Admin)' })
  async deleteImage(@Param('id') id: string) {
    return this.menuService.deleteImage(id);
  }

  @Patch('items/:itemId/images/order')
  @ApiOperation({ summary: 'Reordenar fotos de un plato (Admin)' })
  async reorderImages(@Param('itemId') itemId: string, @Body() dto: ReorderImagesDto) {
    return this.menuService.reorderImages(itemId, dto.imageIds);
  }
}
