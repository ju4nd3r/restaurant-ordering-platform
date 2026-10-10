import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class OrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  afterInit() {
    this.logger.log('📡 Orders WebSocket Gateway inicializado');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Cliente WebSocket conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Cliente WebSocket desconectado: ${client.id}`);
  }

  @SubscribeMessage('join:table')
  handleJoinTable(client: Socket, tableSessionId: string) {
    if (tableSessionId) {
      client.join(`table:${tableSessionId}`);
      this.logger.debug(`Cliente ${client.id} se unió al canal table:${tableSessionId}`);
      return { status: 'joined', room: `table:${tableSessionId}` };
    }
  }

  @SubscribeMessage('leave:table')
  handleLeaveTable(client: Socket, tableSessionId: string) {
    if (tableSessionId) {
      client.leave(`table:${tableSessionId}`);
      this.logger.debug(`Cliente ${client.id} salió del canal table:${tableSessionId}`);
      return { status: 'left', room: `table:${tableSessionId}` };
    }
  }

  @SubscribeMessage('join:kitchen')
  handleJoinKitchen(client: Socket, restaurantId: string) {
    if (restaurantId) {
      client.join(`kitchen:${restaurantId}`);
      this.logger.debug(`Cliente ${client.id} se unió al canal kitchen:${restaurantId}`);
      return { status: 'joined', room: `kitchen:${restaurantId}` };
    }
  }

  @SubscribeMessage('join:waiter')
  handleJoinWaiter(client: Socket, waiterId: string) {
    if (waiterId) {
      client.join(`waiter:${waiterId}`);
      this.logger.debug(`Cliente ${client.id} se unió al canal waiter:${waiterId}`);
      return { status: 'joined', room: `waiter:${waiterId}` };
    }
  }

  // ============================================================================
  // SERVER EMITTERS
  // ============================================================================

  notifyOrderCreated(order: any) {
    if (!this.server) return;

    // Notify the specific table session
    if (order.tableSessionId) {
      this.server.to(`table:${order.tableSessionId}`).emit('order:created', order);
    }

    // Notify the kitchen display system (KDS)
    if (order.restaurantId) {
      this.server.to(`kitchen:${order.restaurantId}`).emit('order:created', order);
    }

    // Notify assigned waiter if present
    if (order.waiterId) {
      this.server.to(`waiter:${order.waiterId}`).emit('order:created', order);
    }
  }

  notifyOrderStatusChanged(payload: {
    orderId: string;
    tableSessionId: string;
    restaurantId: string;
    newStatus: string;
    updatedAt: string;
  }) {
    if (!this.server) return;

    if (payload.tableSessionId) {
      this.server.to(`table:${payload.tableSessionId}`).emit('order:status-changed', {
        orderId: payload.orderId,
        newStatus: payload.newStatus,
        updatedAt: payload.updatedAt,
      });
    }

    if (payload.restaurantId) {
      this.server.to(`kitchen:${payload.restaurantId}`).emit('order:status-changed', {
        orderId: payload.orderId,
        newStatus: payload.newStatus,
        updatedAt: payload.updatedAt,
      });
    }
  }
}
