import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from './menu.service';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_SERVICE_TOKEN } from '../storage/storage.interface';
import { ImageProcessorService } from '../storage/image-processor.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MenuService', () => {
  let service: MenuService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    menuItem: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    menuItemImage: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
    };
    restaurant: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let storageService: {
    uploadFile: jest.Mock;
    deleteFile: jest.Mock;
  };
  let imageProcessorService: {
    processDishImage: jest.Mock;
  };

  const mockCategory = {
    id: 'cat-1',
    restaurantId: 'rest-1',
    name: 'Platos Fuertes',
    slug: 'platos-fuertes',
    sortOrder: 0,
    isActive: true,
    _count: { items: 0 },
  };

  const mockMenuItem = {
    id: 'item-1',
    restaurantId: 'rest-1',
    categoryId: 'cat-1',
    name: 'Ajiaco Bogotano',
    description: 'Sopa tradicional de pollo con tres tipos de papa, guascas, alcaparras y crema',
    basePriceCop: 34000,
    prepTimeMinutes: 15,
    isAvailable: true,
    ingredients: ['pollo', 'papa criolla', 'papa pastusa', 'papa sabanera', 'guascas'],
    allergens: ['DAIRY'],
    dietaryFlags: [],
    sortOrder: 0,
    images: [],
    optionGroups: [],
    modifiers: [],
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      menuItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      menuItemImage: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      restaurant: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rest-1', isActive: true }),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    storageService = {
      uploadFile: jest.fn().mockResolvedValue('/api/uploads/image.webp'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    imageProcessorService = {
      processDishImage: jest.fn().mockResolvedValue({
        fullBuffer: Buffer.from('full'),
        thumbBuffer: Buffer.from('thumb'),
        blurPlaceholder: 'data:image/webp;base64,mock',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: PrismaService, useValue: prisma },
        { provide: STORAGE_SERVICE_TOKEN, useValue: storageService },
        { provide: ImageProcessorService, useValue: imageProcessorService },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  describe('getCategoriesWithItems', () => {
    it('returns active categories with available items', async () => {
      prisma.category.findMany.mockResolvedValue([
        { ...mockCategory, items: [mockMenuItem] },
      ]);

      const result = await service.getCategoriesWithItems('rest-1');

      expect(result).toHaveLength(1);
      expect(result[0].items).toHaveLength(1);
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantId: 'rest-1', isActive: true },
        }),
      );
    });
  });

  describe('getMenuItemById', () => {
    it('returns item when found', async () => {
      prisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      const result = await service.getMenuItemById('item-1');
      expect(result.id).toBe('item-1');
    });

    it('throws NotFoundException when item does not exist', async () => {
      prisma.menuItem.findUnique.mockResolvedValue(null);
      await expect(service.getMenuItemById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCategory', () => {
    it('creates category with slug auto-generated from name', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(mockCategory);

      await service.createCategory('rest-1', {
        name: 'Platos Fuertes',
      });

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Platos Fuertes',
            slug: 'platos-fuertes',
          }),
        }),
      );
    });
  });

  describe('deleteCategory', () => {
    it('throws BadRequestException if category contains items', async () => {
      prisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        _count: { items: 3 },
      });

      await expect(service.deleteCategory('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('deletes category if items count is 0', async () => {
      prisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        _count: { items: 0 },
      });
      prisma.category.delete.mockResolvedValue(mockCategory);

      await service.deleteCategory('cat-1');
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });

  describe('createMenuItem', () => {
    it('validates category belongs to restaurant and creates item', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);
      prisma.menuItem.create.mockResolvedValue(mockMenuItem);

      const created = await service.createMenuItem('rest-1', {
        categoryId: 'cat-1',
        name: 'Ajiaco Bogotano',
        description: 'Sopa tradicional',
        basePriceCop: 34000,
      });

      expect(created.name).toBe('Ajiaco Bogotano');
      expect(prisma.menuItem.create).toHaveBeenCalled();
    });

    it('throws BadRequestException if category does not exist in restaurant', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.createMenuItem('rest-1', {
          categoryId: 'non-existent-cat',
          name: 'Plato',
          description: 'Desc',
          basePriceCop: 20000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleAvailability', () => {
    it('updates item availability state', async () => {
      prisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      prisma.menuItem.update.mockResolvedValue({
        id: 'item-1',
        name: 'Ajiaco Bogotano',
        isAvailable: false,
      });

      const updated = await service.toggleAvailability('item-1', false);
      expect(updated.isAvailable).toBe(false);
    });
  });

  describe('uploadItemImage', () => {
    it('processes image with Sharp and saves image records', async () => {
      prisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      prisma.menuItemImage.create.mockResolvedValue({
        id: 'img-1',
        menuItemId: 'item-1',
        url: '/api/uploads/item-1_123_full.webp',
        thumbnailUrl: '/api/uploads/item-1_123_thumb.webp',
        blurPlaceholder: 'data:image/webp;base64,mock',
        sortOrder: 0,
      });

      const mockFile = {
        buffer: Buffer.from('fake-image-bytes'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const result = await service.uploadItemImage('item-1', mockFile);

      expect(imageProcessorService.processDishImage).toHaveBeenCalled();
      expect(storageService.uploadFile).toHaveBeenCalledTimes(2); // full and thumb
      expect(result.id).toBe('img-1');
    });
  });
});
