import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Allergen, DietaryFlag } from '@prisma/client';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto';
import {
  CreateOptionGroupDto,
  UpdateOptionGroupDto,
  CreateOptionDto,
  UpdateOptionDto,
} from './dto/option-group.dto';
import { CreateModifierDto, UpdateModifierDto } from './dto/modifier.dto';
import { QueryMenuItemsDto } from './dto/query-menu-items.dto';
import { STORAGE_SERVICE_TOKEN, StorageService } from '../storage/storage.interface';
import { ImageProcessorService } from '../storage/image-processor.service';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE_TOKEN)
    private readonly storageService: StorageService,
    private readonly imageProcessorService: ImageProcessorService,
  ) {}

  // ============================================================================
  // PUBLIC CONSUMER QUERIES
  // ============================================================================

  async getCategoriesWithItems(restaurantId?: string) {
    const targetRestaurantId = restaurantId || (await this.getDefaultRestaurantId());

    return this.prisma.category.findMany({
      where: {
        restaurantId: targetRestaurantId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            optionGroups: {
              include: {
                options: { orderBy: { additionalPriceCop: 'asc' } },
              },
            },
            modifiers: {
              where: { isAvailable: true },
            },
          },
        },
      },
    });
  }

  async searchMenuItems(query: QueryMenuItemsDto) {
    const restaurantId = query.restaurantId || (await this.getDefaultRestaurantId());

    const where: any = {
      restaurantId,
    };

    if (query.onlyAvailable !== false) {
      where.isAvailable = true;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { ingredients: { has: q } },
      ];
    }

    if (query.dietaryFlags) {
      const flags = query.dietaryFlags
        .split(',')
        .map((f) => f.trim().toUpperCase() as DietaryFlag)
        .filter((f) => Object.values(DietaryFlag).includes(f));
      if (flags.length > 0) {
        where.dietaryFlags = { hasSome: flags };
      }
    }

    return this.prisma.menuItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        optionGroups: {
          include: {
            options: { orderBy: { additionalPriceCop: 'asc' } },
          },
        },
        modifiers: {
          where: query.onlyAvailable !== false ? { isAvailable: true } : undefined,
        },
      },
    });
  }

  async getMenuItemById(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        optionGroups: {
          include: {
            options: { orderBy: { additionalPriceCop: 'asc' } },
          },
        },
        modifiers: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Plato con ID "${id}" no encontrado`);
    }

    return item;
  }

  // ============================================================================
  // ADMIN: CATEGORIES CRUD
  // ============================================================================

  async getAllCategoriesAdmin(restaurantId?: string) {
    const targetRestaurantId = restaurantId || (await this.getDefaultRestaurantId());
    return this.prisma.category.findMany({
      where: { restaurantId: targetRestaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
  }

  async createCategory(restaurantId: string, dto: CreateCategoryDto) {
    const slugBase = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    let finalSlug = slugBase;
    let counter = 1;

    while (
      await this.prisma.category.findUnique({
        where: { restaurantId_slug: { restaurantId, slug: finalSlug } },
      })
    ) {
      finalSlug = `${slugBase}-${counter}`;
      counter++;
    }

    return this.prisma.category.create({
      data: {
        restaurantId,
        name: dto.name.trim(),
        slug: finalSlug,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoría con ID "${id}" no encontrada`);
    }

    let finalSlug = category.slug;
    if (dto.slug && dto.slug !== category.slug) {
      const slugCandidate = slugify(dto.slug);
      const existing = await this.prisma.category.findUnique({
        where: {
          restaurantId_slug: {
            restaurantId: category.restaurantId,
            slug: slugCandidate,
          },
        },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`El slug "${slugCandidate}" ya está en uso en este restaurante`);
      }
      finalSlug = slugCandidate;
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        slug: finalSlug,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!category) {
      throw new NotFoundException(`Categoría con ID "${id}" no encontrada`);
    }

    if (category._count.items > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría porque contiene ${category._count.items} plato(s). Reasigne o elimine los platos primero.`,
      );
    }

    return this.prisma.category.delete({ where: { id } });
  }

  // ============================================================================
  // ADMIN: MENU ITEMS CRUD
  // ============================================================================

  async createMenuItem(restaurantId: string, dto: CreateMenuItemDto) {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, restaurantId },
    });
    if (!category) {
      throw new BadRequestException(
        `La categoría con ID "${dto.categoryId}" no existe en este restaurante`,
      );
    }

    return this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        description: dto.description.trim(),
        basePriceCop: dto.basePriceCop,
        prepTimeMinutes: dto.prepTimeMinutes ?? 15,
        isAvailable: dto.isAvailable ?? true,
        ingredients: dto.ingredients ?? [],
        allergens: dto.allergens ?? [],
        dietaryFlags: dto.dietaryFlags ?? [],
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        category: true,
        images: true,
        optionGroups: true,
        modifiers: true,
      },
    });
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Plato con ID "${id}" no encontrado`);
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const cat = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, restaurantId: existing.restaurantId },
      });
      if (!cat) {
        throw new BadRequestException(
          `La categoría especificada no existe en el restaurante del plato`,
        );
      }
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name ? dto.name.trim() : undefined,
        description: dto.description ? dto.description.trim() : undefined,
        basePriceCop: dto.basePriceCop,
        prepTimeMinutes: dto.prepTimeMinutes,
        isAvailable: dto.isAvailable,
        ingredients: dto.ingredients,
        allergens: dto.allergens,
        dietaryFlags: dto.dietaryFlags,
        sortOrder: dto.sortOrder,
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        optionGroups: {
          include: { options: true },
        },
        modifiers: true,
      },
    });
  }

  async toggleAvailability(id: string, isAvailable: boolean) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Plato con ID "${id}" no encontrado`);
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable },
      select: {
        id: true,
        name: true,
        isAvailable: true,
      },
    });
  }

  async deleteMenuItem(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!item) {
      throw new NotFoundException(`Plato con ID "${id}" no encontrado`);
    }

    // Delete image files from storage
    for (const image of item.images) {
      await this.storageService.deleteFile(image.url);
      await this.storageService.deleteFile(image.thumbnailUrl);
    }

    return this.prisma.menuItem.delete({ where: { id } });
  }

  // ============================================================================
  // ADMIN: OPTION GROUPS & OPTIONS CRUD
  // ============================================================================

  async createOptionGroup(itemId: string, dto: CreateOptionGroupDto) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException(`Plato con ID "${itemId}" no encontrado`);
    }

    const min = dto.minSelectable ?? 1;
    const max = dto.maxSelectable ?? 1;
    if (min > max) {
      throw new BadRequestException('minSelectable no puede ser mayor que maxSelectable');
    }

    return this.prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: itemId,
        name: dto.name.trim(),
        minSelectable: min,
        maxSelectable: max,
      },
      include: { options: true },
    });
  }

  async updateOptionGroup(groupId: string, dto: UpdateOptionGroupDto) {
    const group = await this.prisma.menuItemOptionGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Grupo de opciones con ID "${groupId}" no encontrado`);
    }

    const min = dto.minSelectable ?? group.minSelectable;
    const max = dto.maxSelectable ?? group.maxSelectable;
    if (min > max) {
      throw new BadRequestException('minSelectable no puede ser mayor que maxSelectable');
    }

    return this.prisma.menuItemOptionGroup.update({
      where: { id: groupId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        minSelectable: dto.minSelectable,
        maxSelectable: dto.maxSelectable,
      },
      include: { options: true },
    });
  }

  async deleteOptionGroup(groupId: string) {
    const group = await this.prisma.menuItemOptionGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Grupo de opciones con ID "${groupId}" no encontrado`);
    }
    return this.prisma.menuItemOptionGroup.delete({ where: { id: groupId } });
  }

  async createOption(groupId: string, dto: CreateOptionDto) {
    const group = await this.prisma.menuItemOptionGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Grupo de opciones con ID "${groupId}" no encontrado`);
    }

    return this.prisma.menuItemOption.create({
      data: {
        optionGroupId: groupId,
        name: dto.name.trim(),
        additionalPriceCop: dto.additionalPriceCop ?? 0,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async updateOption(optionId: string, dto: UpdateOptionDto) {
    const option = await this.prisma.menuItemOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new NotFoundException(`Opción con ID "${optionId}" no encontrada`);
    }

    return this.prisma.menuItemOption.update({
      where: { id: optionId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        additionalPriceCop: dto.additionalPriceCop,
        isDefault: dto.isDefault,
      },
    });
  }

  async deleteOption(optionId: string) {
    const option = await this.prisma.menuItemOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new NotFoundException(`Opción con ID "${optionId}" no encontrada`);
    }
    return this.prisma.menuItemOption.delete({ where: { id: optionId } });
  }

  // ============================================================================
  // ADMIN: MODIFIERS CRUD
  // ============================================================================

  async createModifier(itemId: string, dto: CreateModifierDto) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException(`Plato con ID "${itemId}" no encontrado`);
    }

    return this.prisma.menuItemModifier.create({
      data: {
        menuItemId: itemId,
        name: dto.name.trim(),
        priceCop: dto.priceCop,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  async updateModifier(modifierId: string, dto: UpdateModifierDto) {
    const mod = await this.prisma.menuItemModifier.findUnique({
      where: { id: modifierId },
    });
    if (!mod) {
      throw new NotFoundException(`Adicional con ID "${modifierId}" no encontrado`);
    }

    return this.prisma.menuItemModifier.update({
      where: { id: modifierId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        priceCop: dto.priceCop,
        isAvailable: dto.isAvailable,
      },
    });
  }

  async deleteModifier(modifierId: string) {
    const mod = await this.prisma.menuItemModifier.findUnique({
      where: { id: modifierId },
    });
    if (!mod) {
      throw new NotFoundException(`Adicional con ID "${modifierId}" no encontrado`);
    }
    return this.prisma.menuItemModifier.delete({ where: { id: modifierId } });
  }

  // ============================================================================
  // ADMIN: IMAGE MANAGEMENT & SHARP PROCESSING
  // ============================================================================

  async uploadItemImage(itemId: string, file: Express.Multer.File) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { images: true },
    });
    if (!item) {
      throw new NotFoundException(`Plato con ID "${itemId}" no encontrado`);
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Archivo de imagen no recibido');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo subido no es una imagen válida');
    }

    // Process with Sharp
    const processed = await this.imageProcessorService.processDishImage(file.buffer);

    const timestamp = Date.now();
    const fullFilename = `${itemId}_${timestamp}_full.webp`;
    const thumbFilename = `${itemId}_${timestamp}_thumb.webp`;

    const fullUrl = await this.storageService.uploadFile(
      processed.fullBuffer,
      fullFilename,
      'image/webp',
    );
    const thumbUrl = await this.storageService.uploadFile(
      processed.thumbBuffer,
      thumbFilename,
      'image/webp',
    );

    const sortOrder = item.images.length;

    return this.prisma.menuItemImage.create({
      data: {
        menuItemId: itemId,
        url: fullUrl,
        thumbnailUrl: thumbUrl,
        blurPlaceholder: processed.blurPlaceholder,
        sortOrder,
      },
    });
  }

  async deleteImage(imageId: string) {
    const img = await this.prisma.menuItemImage.findUnique({
      where: { id: imageId },
    });
    if (!img) {
      throw new NotFoundException(`Imagen con ID "${imageId}" no encontrada`);
    }

    await this.storageService.deleteFile(img.url);
    await this.storageService.deleteFile(img.thumbnailUrl);

    return this.prisma.menuItemImage.delete({ where: { id: imageId } });
  }

  async reorderImages(itemId: string, imageIds: string[]) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { images: true },
    });
    if (!item) {
      throw new NotFoundException(`Plato con ID "${itemId}" no encontrado`);
    }

    const itemImageIds = new Set(item.images.map((img) => img.id));
    for (const id of imageIds) {
      if (!itemImageIds.has(id)) {
        throw new BadRequestException(`La imagen "${id}" no pertenece a este plato`);
      }
    }

    await this.prisma.$transaction(
      imageIds.map((id, index) =>
        this.prisma.menuItemImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.prisma.menuItemImage.findMany({
      where: { menuItemId: itemId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async getDefaultRestaurantId(): Promise<string> {
    const rest = await this.prisma.restaurant.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!rest) {
      throw new NotFoundException('No se encontró ningún restaurante activo configurado');
    }
    return rest.id;
  }
}
