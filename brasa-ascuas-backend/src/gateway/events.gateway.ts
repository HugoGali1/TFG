import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  /** Cliente se une a la sala de su sesión para recibir updates de su pedido */
  @SubscribeMessage('join-session')
  handleJoinSession(
    @MessageBody() sessionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`session:${sessionId}`);
  }

  /** Panel de cocina se une a la sala global */
  @SubscribeMessage('join-kitchen')
  handleJoinKitchen(@ConnectedSocket() client: Socket) {
    client.join('kitchen');
  }

  /** Panel de camareros */
  @SubscribeMessage('join-waiters')
  handleJoinWaiters(@ConnectedSocket() client: Socket) {
    client.join('waiters');
  }

  emitNewOrder(order: any) {
    this.server.to('kitchen').to('waiters').emit('new-order', order);
    this.server.to(`session:${order.session}`).emit('order-received', order);
  }

  emitOrderStatusUpdate(order: any) {
    this.server.to(`session:${order.session}`).emit('order-updated', order);
    this.server.to('kitchen').emit('order-updated', order);
  }

  emitWaiterRequest(request: any) {
    this.server.to('waiters').emit('waiter-request', request);
  }

  emitPaymentConfirmed(sessionId: string, payment: any) {
    this.server.to(`session:${sessionId}`).emit('payment-confirmed', payment);
  }
}
