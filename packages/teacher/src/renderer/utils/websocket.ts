// src/renderer/utils/websocket.ts

interface WebSocketMessage {
  type: string
  [key: string]: any
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout = 3000
  private handlers: Map<string, ((data: any) => void)[]> = new Map()
  private pendingMessages: WebSocketMessage[] = []
  private heartbeatInterval: number | null = null
  private reconnectTimer: number | null = null
  private isIntentionallyClosed = false
  private lastHeartbeat: number = Date.now()
  private heartbeatTimeout = 45000 // 45 seconds

  constructor(private url: string) {}

  connect() {
    if (this.isIntentionallyClosed) return

    try {
      this.ws = new WebSocket(this.url)
      this.setupEventListeners()
      this.setupHeartbeat()
      this.setupHeartbeatCheck()
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    }
  }

  private setupEventListeners() {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('Connected to server')
      this.reconnectAttempts = 0
      this.lastHeartbeat = Date.now()
      this.emit('connection-status', 'connected')
      
      // Send pending messages
      while (this.pendingMessages.length > 0) {
        const message = this.pendingMessages.shift()
        if (message) this.send(message)
      }
    }

    this.ws.onclose = (event) => {
      console.log('Disconnected from server:', event.code, event.reason)
      this.cleanup()
      this.emit('connection-status', 'disconnected')
      
      if (!this.isIntentionallyClosed) {
        this.handleReconnect()
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.emit('connection-status', 'error')
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'heartbeat') {
          this.handleHeartbeat()
        } else {
          this.handleMessage(message)
        }
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    }
  }

  private setupHeartbeat() {
    // Clear any existing heartbeat interval
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval)
    }

    // Set up new heartbeat interval
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat' })
      }
    }, 30000) // 30 seconds
  }

  private setupHeartbeatCheck() {
    // Monitor heartbeat responses
    const checkInterval = window.setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat
      if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
        console.warn('Heartbeat timeout, reconnecting...')
        this.reconnect()
      }
    }, 15000) // Check every 15 seconds

    // Clean up interval when connection closes
    this.ws?.addEventListener('close', () => {
      window.clearInterval(checkInterval)
    })
  }

  private handleHeartbeat() {
    this.lastHeartbeat = Date.now()
    this.emit('connection-status', 'connected')
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      // Remove all event listeners
      this.ws.onopen = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
    }
  }

  private handleReconnect() {
    if (this.isIntentionallyClosed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('connection-status', 'failed')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
    
    // Exponential backoff with max of 30 seconds
    const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect()
    }, timeout)
  }

  private reconnect() {
    if (this.ws) {
      this.ws.close()
    }
    this.cleanup()
    this.connect()
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.handlers.get(message.type) || []
    handlers.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error('Error in message handler:', error)
      }
    })
  }

  on(event: string, handler: (data: any) => void) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)?.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index !== -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending message:', error)
        this.pendingMessages.push(message)
      }
    } else {
      this.pendingMessages.push(message)
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.handlers.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error('Error in event handler:', error)
      }
    })
  }

  close() {
    this.isIntentionallyClosed = true
    this.cleanup()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
