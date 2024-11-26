// src/renderer/utils/websocket.ts
export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout = 3000
  private handlers: Map<string, ((data: any) => void)[]> = new Map()
  private pendingMessages: any[] = []

  constructor(private url: string) {}

  connect() {
    try {
      this.ws = new WebSocket(this.url)
      this.setupEventListeners()
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    }
  }

  private setupEventListeners() {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.emit('connection-status', 'connected')
      
      // 发送等待的消息
      while (this.pendingMessages.length > 0) {
        const message = this.pendingMessages.shift()
        this.send(message)
      }
    }

    this.ws.onclose = () => {
      this.emit('connection-status', 'disconnected')
      this.handleReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.emit('connection-status', 'error')
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
    
    setTimeout(() => {
      this.connect()
    }, this.reconnectTimeout)
  }

  private handleMessage(message: { type: string, [key: string]: any }) {
    const handlers = this.handlers.get(message.type) || []
    handlers.forEach(handler => handler(message))
  }

  on(event: string, handler: (data: any) => void) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)?.push(handler)
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.pendingMessages.push(message)
    }
  }

  close() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}