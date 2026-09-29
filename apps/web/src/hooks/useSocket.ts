'use client'

import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/lib/stores/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

let _socket: Socket | null = null

function getSocket(accessToken: string): Socket {
  if (_socket?.connected) return _socket

  _socket = io(API_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  return _socket
}

export function disconnectSocket() {
  _socket?.disconnect()
  _socket = null
}

/**
 * Connects to the Socket.io server and subscribes to `user:{userId}` room.
 * Returns the socket instance for consumer-side event binding.
 */
export function useSocket() {
  const { accessToken, user } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!accessToken || !user) return

    const socket = getSocket(accessToken)
    socketRef.current = socket

    if (!socket.connected) {
      socket.connect()
    }

    socket.emit('join', `user:${user.id}`)

    return () => {
      // Don't disconnect on component unmount — socket is a singleton
    }
  }, [accessToken, user])

  return socketRef.current
}
