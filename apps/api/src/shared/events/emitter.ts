import { EventEmitter } from 'node:events'
import type { DomainEvent } from './event-types.js'

// Build a lookup: event type string → payload type (resolves union narrowing issue)
type EventMap = {
  [E in DomainEvent as E['type']]: E['payload']
}

class TypedEmitter extends EventEmitter {
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): boolean {
    return super.emit(event as string, payload)
  }

  on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): this {
    return super.on(event as string, listener)
  }

  off<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): this {
    return super.off(event as string, listener)
  }
}

// Singleton in-process event bus
export const emitter = new TypedEmitter()
emitter.setMaxListeners(50)
