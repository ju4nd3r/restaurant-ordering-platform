import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { MenuController } from './menu.controller';
import { MenuAdminController } from './menu-admin.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [MenuController, MenuAdminController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
