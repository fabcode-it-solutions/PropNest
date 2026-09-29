import type { Server } from 'socket.io'

let _io: Server | null = null

export function setIo(server: Server): void {
  _io = server
}

export function getIo(): Server {
  if (!_io) throw new Error('Socket.io server not initialized')
  return _io
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  _io?.to(`user:${userId}`).emit(event, data)
}

export function emitToRoom(room: string, event: string, data: unknown): void {
  _io?.to(room).emit(event, data)
}
