import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ItemLockInfo {
  orderItemId: string;
  participantId: string;
  expiresAt: string;
}

@Injectable()
export class BillSplitLockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillSplitLockService.name);
  private redisClient: Redis | null = null;
  // In-memory fallback if Redis is unavailable or for unit tests
  private readonly inMemoryLocks = new Map<
    string,
    { participantId: string; expiresAtMs: number }
  >();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const redisUrl =
        this.configService.get<string>('REDIS_URL') || 'redis://localhost:6381';
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null, // Don't crash or hang if redis isn't reachable
      });

      this.redisClient.on('error', (err) => {
        this.logger.warn(`Redis no disponible para bloqueos de ítems, usando fallback en memoria: ${err.message}`);
      });

      this.redisClient.on('connect', () => {
        this.logger.log(' Conectado a Redis para control de concurrencia en división de cuentas');
      });
    } catch (err: any) {
      this.logger.warn(`Error al conectar a Redis: ${err?.message}. Usando almacenamiento en memoria.`);
      this.redisClient = null;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        // ignore
      }
    }
  }

  private getKey(tableSessionId: string, orderItemId: string): string {
    return `lock:session:${tableSessionId}:item:${orderItemId}`;
  }

  /**
   * Attempts to lock an item for a participant with TTL (default 10 minutes = 600s).
   * Returns true if lock was acquired, false if already locked by another participant.
   */
  async lockItem(
    tableSessionId: string,
    orderItemId: string,
    participantId: string,
    ttlSeconds: number = 600,
  ): Promise<{ acquired: boolean; expiresAt: string }> {
    const key = this.getKey(tableSessionId, orderItemId);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        // SET key participantId EX ttlSeconds NX
        const result = await this.redisClient.set(key, participantId, 'EX', ttlSeconds, 'NX');
        if (result === 'OK') {
          return { acquired: true, expiresAt };
        }
        // If key already exists, check if it's the SAME participant
        const currentHolder = await this.redisClient.get(key);
        if (currentHolder === participantId) {
          // Re-extend TTL
          await this.redisClient.expire(key, ttlSeconds);
          return { acquired: true, expiresAt };
        }
        return { acquired: false, expiresAt: '' };
      } catch (err: any) {
        this.logger.warn(`Redis error en lockItem, usando fallback: ${err.message}`);
      }
    }

    // In-memory fallback
    const now = Date.now();
    const existing = this.inMemoryLocks.get(key);
    if (existing && existing.expiresAtMs > now && existing.participantId !== participantId) {
      return { acquired: false, expiresAt: '' };
    }

    this.inMemoryLocks.set(key, {
      participantId,
      expiresAtMs: now + ttlSeconds * 1000,
    });
    return { acquired: true, expiresAt };
  }

  /**
   * Releases an item lock.
   */
  async unlockItem(
    tableSessionId: string,
    orderItemId: string,
    participantId?: string,
  ): Promise<boolean> {
    const key = this.getKey(tableSessionId, orderItemId);

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        if (participantId) {
          const currentHolder = await this.redisClient.get(key);
          if (currentHolder && currentHolder !== participantId) {
            return false; // Can't unlock someone else's item
          }
        }
        await this.redisClient.del(key);
        return true;
      } catch (err: any) {
        this.logger.warn(`Redis error en unlockItem, usando fallback: ${err.message}`);
      }
    }

    // In-memory fallback
    const existing = this.inMemoryLocks.get(key);
    if (existing && participantId && existing.participantId !== participantId) {
      return false;
    }
    this.inMemoryLocks.delete(key);
    return true;
  }

  /**
   * Checks if an item is locked and by whom.
   */
  async getItemLock(
    tableSessionId: string,
    orderItemId: string,
  ): Promise<{ isLocked: boolean; participantId?: string }> {
    const key = this.getKey(tableSessionId, orderItemId);

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const holder = await this.redisClient.get(key);
        if (holder) {
          return { isLocked: true, participantId: holder };
        }
        return { isLocked: false };
      } catch (err: any) {
        this.logger.warn(`Redis error en getItemLock, usando fallback: ${err.message}`);
      }
    }

    const now = Date.now();
    const existing = this.inMemoryLocks.get(key);
    if (existing && existing.expiresAtMs > now) {
      return { isLocked: true, participantId: existing.participantId };
    }
    this.inMemoryLocks.delete(key);
    return { isLocked: false };
  }
}
