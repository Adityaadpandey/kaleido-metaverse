// /lib/websocket.ts

export type WebSocketMessage = {
    type: string;
    [key: string]: any;
};

class WebSocketClient {
    private socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private token: string | null = null;
    private isConnecting = false;
    private messageQueue: string[] = [];

    private handlers: {
        [type: string]: Set<(data: any) => void>;
    } = {};

    // Connect to the WebSocket server
    connect(token: string): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return; // Already connected
        }

        if (this.isConnecting) {
            return; // Already attempting to connect
        }

        this.token = token;
        this.isConnecting = true;

        const wsUrl = `${this.getWebSocketUrl()}?token=${encodeURIComponent(token)}`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onmessage = this.handleMessage.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
        this.socket.onerror = this.handleError.bind(this);
    }

    // Disconnect from the WebSocket server
    disconnect(): void {
        this.clearReconnectTimeout();

        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onclose = null;
            this.socket.onerror = null;

            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.close(1000, 'Client disconnected');
            }

            this.socket = null;
        }

        this.token = null;
        this.isConnecting = false;
        this.messageQueue = [];
        this.triggerEvent('disconnect', {});
    }

    // Check if connected
    isConnected(): boolean {
        return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    }

    // Send a message to the server
    send(type: string, data: any = {}): void {
        const message = JSON.stringify({
            type,
            ...data
        });

        if (this.isConnected()) {
            this.socket!.send(message);
        } else {
            // Queue message to be sent when connected
            this.messageQueue.push(message);

            // If not connecting, try to reconnect
            if (!this.isConnecting && this.token) {
                this.connect(this.token);
            }
        }
    }

    // Register event handler
    on(type: string, handler: (data: any) => void): () => void {
        if (!this.handlers[type]) {
            this.handlers[type] = new Set();
        }

        this.handlers[type].add(handler);

        // Return a function to remove the handler
        return () => this.off(type, handler);
    }

    // Remove event handler
    off(type: string, handler: (data: any) => void): void {
        if (this.handlers[type]) {
            this.handlers[type].delete(handler);
        }
    }

    // Handle WebSocket open event
    private handleOpen(): void {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Send any queued messages
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message && this.socket) {
                this.socket.send(message);
            }
        }

        this.triggerEvent('connect', {});
    }

    // Handle WebSocket message event
    private handleMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.triggerEvent(message.type, message);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    // Handle WebSocket close event
    private handleClose(event: CloseEvent): void {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this.socket = null;
        this.isConnecting = false;

        this.triggerEvent('disconnect', { code: event.code, reason: event.reason });

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
            this.scheduleReconnect();
        }
    }

    // Handle WebSocket error event
    private handleError(event: Event): void {
        console.error('WebSocket error:', event);
        this.triggerEvent('error', { event });
    }

    // Trigger event handlers
    private triggerEvent(type: string, data: any): void {
        const handlers = this.handlers[type];
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in ${type} handler:`, error);
                }
            });
        }
    }

    // Schedule a reconnection attempt
    private scheduleReconnect(): void {
        this.clearReconnectTimeout();

        if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.token) {
            return;
        }

        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
        // @ts-expect-error
        this.reconnectTimeout = setTimeout(() => {
            if (this.token) {
                this.reconnectAttempts++;
                console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                this.connect(this.token);
            }
        }, delay);
    }

    // Clear any pending reconnect timeout
    private clearReconnectTimeout(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    // Get WebSocket URL based on the environment
    private getWebSocketUrl(): string {
        const host = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${host}/ws`;
    }

    // Specialized methods for the virtual world

    // Join a space
    joinSpace(spaceId: string, instanceId: string | null = null): void {
        this.send('joinSpace', { spaceId, instanceId });
    }

    // Leave a space
    leaveSpace(spaceId: string, instanceId: string | null = null): void {
        this.send('leaveSpace', { spaceId, instanceId });
    }

    // Update position in a space
    updatePosition(spaceId: string, instanceId: string | null, x: number, y: number, z: number,
        rotationX: number = 0, rotationY: number = 0, rotationZ: number = 0): void {
        this.send('updatePosition', {
            spaceId, instanceId, x, y, z, rotationX, rotationY, rotationZ
        });
    }

    // Send a chat message
    sendChatMessage(content: string, options: {
        spaceId?: string,
        channelId?: string,
        recipientId?: string
    }): void {
        this.send('sendChatMessage', {
            content,
            ...options
        });
    }

    // Update user status
    updateStatus(status: 'Online' | 'Away' | 'Busy' | 'Invisible'): void {
        this.send('updateStatus', { status });
    }
}

// Create a singleton instance
const websocketClient = new WebSocketClient();

export default websocketClient;
