import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

interface Socket {
  id: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data: any) => void;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeConnections = new Map<string, Set<string>>();

  handleConnection(client: any) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    console.log(`Client disconnected: ${client.id}`);
    
    this.activeConnections.forEach((sockets, eventId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.activeConnections.delete(eventId);
      }
    });
  }

  @SubscribeMessage('join-event')
  handleJoinEvent(
    @ConnectedSocket() client: any,
    @MessageBody() eventId: string,
  ): void {
    client.join(`event-${eventId}`);
    
    if (!this.activeConnections.has(eventId)) {
      this.activeConnections.set(eventId, new Set());
    }
    this.activeConnections.get(eventId)!.add(client.id);
    
    console.log(`Client ${client.id} joined event ${eventId}`);
    
    client.emit('joined-event', { 
      eventId, 
      timestamp: new Date(),
      viewers: this.getEventViewerCount(eventId)
    });
  }

  @SubscribeMessage('leave-event')
  handleLeaveEvent(
    @ConnectedSocket() client: any,
    @MessageBody() eventId: string,
  ): void {
    client.leave(`event-${eventId}`);
    
    const eventConnections = this.activeConnections.get(eventId);
    if (eventConnections) {
      eventConnections.delete(client.id);
      if (eventConnections.size === 0) {
        this.activeConnections.delete(eventId);
      }
    }
    
    console.log(`Client ${client.id} left event ${eventId}`);
  }

  broadcastSeatStatusChange(eventId: string, seatId: string, newStatus: string): void {
    this.server.to(`event-${eventId}`).emit('seatStatusChanged', {
      seatId,
      status: newStatus,
      timestamp: new Date(),
    });
  }

  broadcastBulkSeatUpdate(
    eventId: string,
    updates: Array<{ seatId: string; status: string }>,
  ): void {
    this.server.to(`event-${eventId}`).emit('bulkSeatUpdate', {
      updates,
      timestamp: new Date(),
    });
  }

  sendHoldExpiryWarning(clientId: string, expiresAt: Date, minutesRemaining: number): void {
    this.server.to(clientId).emit('holdExpiryWarning', {
      expiresAt,
      minutesRemaining,
      message: `Your seat hold will expire in ${minutesRemaining} minute(s)`,
    });
  }

  broadcastCapacityUpdate(eventId: string, availableSeats: number, totalSeats: number): void {
    this.server.to(`event-${eventId}`).emit('capacityUpdate', {
      availableSeats,
      totalSeats,
      percentageAvailable: (availableSeats / totalSeats) * 100,
      timestamp: new Date(),
    });
  }

  broadcastSellingFast(eventId: string, percentageLeft: number): void {
    this.server.to(`event-${eventId}`).emit('sellingFast', {
      message: `Only ${percentageLeft}% of seats remaining!`,
      percentageLeft,
      timestamp: new Date(),
    });
  }

  getEventViewerCount(eventId: string): number {
    return this.activeConnections.get(eventId)?.size || 0;
  }

  getActiveEvents(): Array<{ eventId: string; viewers: number }> {
    const events: Array<{ eventId: string; viewers: number }> = [];
    
    this.activeConnections.forEach((viewers, eventId) => {
      events.push({ eventId, viewers: viewers.size });
    });
    
    return events;
  }
}