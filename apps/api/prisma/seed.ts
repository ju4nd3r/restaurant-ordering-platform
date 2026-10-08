import {
  PrismaClient,
  TaxType,
  TipDistributionRule,
  Role,
  Allergen,
  DietaryFlag,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeder de base de datos para restaurante colombiano...');

  // 1. Limpieza de base de datos (desarrollo)
  await prisma.electronicInvoiceLog.deleteMany();
  await prisma.invoiceCreditNote.deleteMany();
  await prisma.electronicInvoice.deleteMany();
  await prisma.tipAllocation.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.billSplitItemAllocation.deleteMany();
  await prisma.billSplit.deleteMany();
  await prisma.orderItemModifierSelection.deleteMany();
  await prisma.orderItemOptionSelection.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.shiftStaff.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.menuItemImage.deleteMany();
  await prisma.menuItemOption.deleteMany();
  await prisma.menuItemOptionGroup.deleteMany();
  await prisma.menuItemModifier.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.restaurant.deleteMany();

  // 2. Restaurante Demo Colombiano
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Sabor Criollo & Parrilla',
      slug: 'sabor-criollo',
      nit: '901458789-3',
      legalName: 'Gastronomía Colombiana S.A.S.',
      address: 'Calle 85 # 14-25, Bogotá, Colombia',
      phone: '+57 310 555 4321',
      taxType: TaxType.INC_8,
      taxPercentage: 8,
      defaultTipPercentage: 10,
      tipDistributionRule: TipDistributionRule.ASSIGNED_WAITER,
      currency: 'COP',
      dianResolutionNumber: '18764000001234',
      dianPrefix: 'SETT',
      dianTechnicalKey: 'fc8eac422eba16e122d5aa92a14e3876ab1fb6',
      isActive: true,
    },
  });

  console.log(`✅ Restaurante creado: ${restaurant.name} (${restaurant.nit})`);

  // 3. Usuarios del Personal con contraseñas encriptadas con Argon2
  const passwordHash = await argon2.hash('StaffPass123!');

  const admin = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      email: 'admin@restaurante.com',
      passwordHash,
      fullName: 'Alejandro Morales (Admin)',
      phone: '+57 300 111 2233',
      roles: {
        create: [{ role: Role.ADMIN }],
      },
    },
  });

  const cashier = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      email: 'caja@restaurante.com',
      passwordHash,
      fullName: 'Valentina Restrepo (Caja)',
      phone: '+57 300 444 5566',
      roles: {
        create: [{ role: Role.CASHIER }],
      },
    },
  });

  const kitchen = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      email: 'cocina@restaurante.com',
      passwordHash,
      fullName: 'Chef Hernán Gómez (Cocina)',
      phone: '+57 300 777 8899',
      roles: {
        create: [{ role: Role.KITCHEN }],
      },
    },
  });

  const waiter1 = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      email: 'carlos.mesero@restaurante.com',
      passwordHash,
      fullName: 'Carlos Duque (Mesero)',
      phone: '+57 311 222 3344',
      roles: {
        create: [{ role: Role.WAITER }],
      },
    },
  });

  const waiter2 = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      email: 'maria.mesera@restaurante.com',
      passwordHash,
      fullName: 'María Camila Silva (Mesera)',
      phone: '+57 312 555 6677',
      roles: {
        create: [{ role: Role.WAITER }],
      },
    },
  });

  console.log('✅ Usuarios del personal creados (Admin, Caja, Cocina, 2 Meseros)');

  // 4. Turno Activo (Almuerzo)
  const shift = await prisma.shift.create({
    data: {
      restaurantId: restaurant.id,
      startTime: new Date(),
      isOpen: true,
      notes: 'Turno de Almuerzo - Servicio Principal',
      staff: {
        create: [
          { userId: waiter1.id },
          { userId: waiter2.id },
          { userId: kitchen.id },
          { userId: cashier.id },
        ],
      },
    },
  });

  console.log(`✅ Turno activo registrado: ${shift.id}`);

  // 5. Mesas Físicas con Tokens Opacos
  const tablesData = [
    {
      number: 1,
      label: 'Mesa 1 (Terraza)',
      zone: 'Terraza',
      qrToken: 'm_mesa1_criollo_9a8b',
      waiterId: waiter1.id,
    },
    {
      number: 2,
      label: 'Mesa 2 (Terraza)',
      zone: 'Terraza',
      qrToken: 'm_mesa2_criollo_7c6d',
      waiterId: waiter1.id,
    },
    {
      number: 3,
      label: 'Mesa 3 (Salón)',
      zone: 'Salón Principal',
      qrToken: 'm_mesa3_criollo_5e4f',
      waiterId: waiter1.id,
    },
    {
      number: 4,
      label: 'Mesa 4 (Salón)',
      zone: 'Salón Principal',
      qrToken: 'm_mesa4_criollo_3g2h',
      waiterId: waiter2.id,
    },
    {
      number: 5,
      label: 'Mesa 5 (VIP)',
      zone: 'Zona VIP',
      qrToken: 'm_mesa5_criollo_1i0j',
      waiterId: waiter2.id,
    },
    {
      number: 6,
      label: 'Mesa 6 (Barra)',
      zone: 'Barra',
      qrToken: 'm_mesa6_criollo_8k7l',
      waiterId: waiter2.id,
    },
  ];

  for (const t of tablesData) {
    await prisma.restaurantTable.create({
      data: {
        restaurantId: restaurant.id,
        number: t.number,
        label: t.label,
        zone: t.zone,
        qrToken: t.qrToken,
        assignedWaiterId: t.waiterId,
      },
    });
  }

  console.log(`✅ ${tablesData.length} mesas físicas creadas con códigos QR opacos`);

  // 6. Categorías del Menú
  const catEntradas = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Entradas & Pasabocas',
      slug: 'entradas',
      sortOrder: 1,
    },
  });

  const catFuertes = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Platos Fuertes & Parrilla',
      slug: 'platos-fuertes',
      sortOrder: 2,
    },
  });

  const catBebidas = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Bebidas & Jugos Naturales',
      slug: 'bebidas',
      sortOrder: 3,
    },
  });

  const catPostres = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Postres Tradicionales',
      slug: 'postres',
      sortOrder: 4,
    },
  });

  console.log('✅ Categorías creadas');

  // 7. Platos con opciones, modificadores y precios en enteros COP
  // Plato 1: Empanaditas
  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catEntradas.id,
      name: 'Empanaditas de Carne Criolla (4 uds)',
      description:
        'Crujientes empanadas de maíz rellenas de carne desmechada sazonada con hogao casero, acompañadas de ají picante y limón.',
      basePriceCop: 16000,
      prepTimeMinutes: 10,
      ingredients: [
        'Maíz amarillo',
        'Carne de res desmechada',
        'Papa criolla',
        'Hogao',
        'Cilantro',
      ],
      allergens: [],
      dietaryFlags: [DietaryFlag.GLUTEN_FREE],
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
            thumbnailUrl:
              'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200&auto=format&fit=crop&q=80',
            sortOrder: 0,
          },
        ],
      },
      modifiers: {
        create: [
          { name: 'Porción extra de ají dulce', priceCop: 2000 },
          { name: 'Porción extra de guacamole', priceCop: 4000 },
        ],
      },
    },
  });

  // Plato 2: Bandeja Paisa
  const bandejaPaisa = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catFuertes.id,
      name: 'Bandeja Paisa Tradicional',
      description:
        'Cargada con frijoles antioqueños, arroz blanco, carne molida fresca, chicharrón crujiente de 5 puntas, chorizo artesanal, huevo frito, tajada de plátano maduro, arepa paisa y aguacate hass.',
      basePriceCop: 48000,
      prepTimeMinutes: 20,
      ingredients: [
        'Frijoles cargamanto',
        'Arroz',
        'Carne molida',
        'Tocino',
        'Chorizo',
        'Huevo',
        'Plátano maduro',
        'Aguacate',
        'Arepa de maíz',
      ],
      allergens: [Allergen.EGGS],
      dietaryFlags: [],
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
            thumbnailUrl:
              'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&auto=format&fit=crop&q=80',
            sortOrder: 0,
          },
        ],
      },
      optionGroups: {
        create: [
          {
            name: 'Término del Huevo Frito',
            minSelectable: 1,
            maxSelectable: 1,
            options: {
              create: [
                { name: 'Yema tierna / blandita', additionalPriceCop: 0, isDefault: true },
                { name: 'Yema bien cocida / dura', additionalPriceCop: 0 },
              ],
            },
          },
        ],
      },
      modifiers: {
        create: [
          { name: 'Chicharrón adicional (150g)', priceCop: 9000 },
          { name: 'Porción de aguacate extra', priceCop: 4000 },
          { name: 'Porción de arroz adicional', priceCop: 3000 },
        ],
      },
    },
  });

  // Plato 3: Lomo al Trapo
  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catFuertes.id,
      name: 'Lomo al Trapo a la Brasa (350g)',
      description:
        'Lomo fino de res envuelto en tela con costra de sal marina y hierbas de páramo, cocido directamente sobre las brasas de carbón vegetal. Servido con papas rústicas y mantequilla de chimichurri.',
      basePriceCop: 56000,
      prepTimeMinutes: 25,
      ingredients: ['Lomo fino de res', 'Sal marina', 'Orégano', 'Romero', 'Mantequilla artesanal'],
      allergens: [Allergen.DAIRY],
      dietaryFlags: [DietaryFlag.KETO, DietaryFlag.GLUTEN_FREE],
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&auto=format&fit=crop&q=80',
            thumbnailUrl:
              'https://images.unsplash.com/photo-1558030006-450675393462?w=200&auto=format&fit=crop&q=80',
            sortOrder: 0,
          },
        ],
      },
      optionGroups: {
        create: [
          {
            name: 'Término de la Carne',
            minSelectable: 1,
            maxSelectable: 1,
            options: {
              create: [
                { name: 'Término Medio (1/2)', additionalPriceCop: 0, isDefault: true },
                { name: 'Tres Cuartos (3/4)', additionalPriceCop: 0 },
                { name: 'Bien Asado (Cocido completo)', additionalPriceCop: 0 },
                { name: 'Azul (Sellado / Jugoso)', additionalPriceCop: 0 },
              ],
            },
          },
          {
            name: 'Acompañamiento Incluido',
            minSelectable: 1,
            maxSelectable: 1,
            options: {
              create: [
                { name: 'Papas a la francesa crocantes', additionalPriceCop: 0, isDefault: true },
                { name: 'Yuca al vapor con hogao', additionalPriceCop: 0 },
                { name: 'Ensalada fresca de la casa', additionalPriceCop: 0 },
              ],
            },
          },
        ],
      },
      modifiers: {
        create: [
          { name: 'Queso campesino fundido encima', priceCop: 5000 },
          { name: 'Chimichurri extra de la casa', priceCop: 2500 },
        ],
      },
    },
  });

  // Plato 4: Limonada de Coco
  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catBebidas.id,
      name: 'Limonada de Coco Frappé',
      description:
        'Bebida refrescante y cremosa preparada con leche de coco natural, zumo de limón tahití recién exprimido y toque de hierbabuena.',
      basePriceCop: 14000,
      prepTimeMinutes: 5,
      ingredients: ['Leche de coco', 'Limón tahití', 'Hielo frappé', 'Hierbabuena'],
      allergens: [],
      dietaryFlags: [DietaryFlag.VEGETARIAN, DietaryFlag.GLUTEN_FREE],
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80',
            thumbnailUrl:
              'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&auto=format&fit=crop&q=80',
            sortOrder: 0,
          },
        ],
      },
    },
  });

  // Plato 5: Postre de Natas
  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catPostres.id,
      name: 'Postre de Natas con Arequipe Casero',
      description:
        'Tradicional postre andino elaborado con capas de natas de leche pura hervida a fuego lento, almíbar de caña, uvas pasas y un toque de canela.',
      basePriceCop: 15000,
      prepTimeMinutes: 5,
      ingredients: ['Leche entera de vaca', 'Azúcar de caña', 'Uvas pasas', 'Canela'],
      allergens: [Allergen.DAIRY],
      dietaryFlags: [DietaryFlag.VEGETARIAN, DietaryFlag.GLUTEN_FREE],
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
            thumbnailUrl:
              'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&auto=format&fit=crop&q=80',
            sortOrder: 0,
          },
        ],
      },
    },
  });

  console.log('✅ Platos colombianos creados con fotos, alérgenos, opciones y modificadores');
  console.log('🎉 Seeder finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
