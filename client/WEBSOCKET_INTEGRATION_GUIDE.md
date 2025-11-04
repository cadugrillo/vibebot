# WebSocket Integration Guide for Frontend

**Task**: VBT-221 - Real-time Message Streaming UI
**Created**: 2025-11-04
**Purpose**: Reference guide for implementing WebSocket integration in ChatPage

---

## Overview

This document provides the complete WebSocket protocol specification for integrating real-time messaging in the frontend. It documents the backend implementation (VBT-39) that we'll integrate with.

---

## WebSocket Server Details

**URL**: `ws://localhost:5000/ws` (development)
**Authentication**: JWT token via query parameter
**Package**: `ws` (WebSocket server)
**Location**: `/src/websocket/`

---

## Event Types

### Message Events

#### 1. `message:send` (Client → Server)
**Purpose**: User sends a message to a conversation

**Payload**:
```typescript
{
  type: 'message:send',
  messageId: string,        // Unique message ID (generate on client)
  conversationId: string,   // Conversation ID
  content: string,          // Message content (max 10,000 chars)
  timestamp: string         // ISO timestamp (optional)
}
```

**Response**: `message:ack` event

---

#### 2. `message:receive` (Server → Client)
**Purpose**: Broadcast user message to all conversation participants

**Payload**:
```typescript
{
  type: 'message:receive',
  messageId: string,
  conversationId: string,
  content: string,
  userId: string,           // Sender's user ID
  timestamp: string         // ISO timestamp from server
}
```

**When received**:
- Add message to conversation
- Display in MessageList
- Update message status to 'sent'

---

#### 3. `message:stream` (Server → Client)
**Purpose**: Stream AI response token-by-token

**Payload**:
```typescript
{
  type: 'message:stream',
  messageId: string,
  conversationId: string,
  content: string,          // Cumulative content (not just delta!)
  isComplete: boolean,      // true when streaming done
  timestamp: string
}
```

**Implementation**:
```typescript
// First stream event - create new AI message
if (!messageExists(messageId)) {
  createMessage({
    id: messageId,
    role: 'assistant',
    content: content,
    status: 'streaming',
    timestamp: new Date(timestamp)
  });
}
// Subsequent events - update content
else {
  updateMessage(messageId, {
    content: content,  // Replace entire content (already cumulative)
    status: isComplete ? 'sent' : 'streaming'
  });
}
```

**Important**:
- `content` is CUMULATIVE (not delta) - replace entire message content
- `isComplete: true` means streaming is done, update status to 'sent'
- `isComplete: false` means more chunks coming, keep status as 'streaming'

---

#### 4. `message:ack` (Server → Client)
**Purpose**: Acknowledge message receipt/delivery

**Payload**:
```typescript
{
  type: 'message:ack',
  messageId: string,
  status: 'received' | 'delivered' | 'error',
  error?: string,           // Error message if status is 'error'
  timestamp: string
}
```

**Status meanings**:
- `received`: Server got the message
- `delivered`: Message broadcast to conversation
- `error`: Something went wrong (see error field)

**Implementation**:
```typescript
client.on('message:ack', (data) => {
  if (data.status === 'error') {
    updateMessage(data.messageId, { status: 'error', error: data.error });
    toast.error(data.error);
  } else if (data.status === 'delivered') {
    updateMessage(data.messageId, { status: 'sent' });
  }
});
```

---

### Typing Events

#### 5. `typing:start` (Client → Server)
**Purpose**: User started typing

**Payload**:
```typescript
{
  type: 'typing:start',
  conversationId: string,
  timestamp: string
}
```

**Server behavior**:
- Broadcasts to all conversation participants (except sender)
- Auto-stops after 5 seconds
- Rate limited (minimum 1 second between updates)

---

#### 6. `typing:stop` (Client → Server)
**Purpose**: User stopped typing

**Payload**:
```typescript
{
  type: 'typing:stop',
  conversationId: string,
  timestamp: string
}
```

---

### Connection Events

#### 7. `connection:established` (Client Event)
**Purpose**: WebSocket connection opened

**Payload**:
```typescript
{
  type: 'connection:established',
  timestamp: string
}
```

---

#### 8. `connection:authenticated` (Server → Client)
**Purpose**: JWT authentication successful

**Payload**:
```typescript
{
  type: 'connection:authenticated',
  connectionId: string,     // Unique connection ID
  timestamp: string
}
```

---

#### 9. `connection:disconnected` (Client Event)
**Purpose**: WebSocket connection closed

**Payload**:
```typescript
{
  type: 'connection:disconnected',
  code: number,             // WebSocket close code
  reason: string,           // Close reason
  timestamp: string
}
```

---

#### 10. `connection:error` (Client/Server Event)
**Purpose**: Connection error occurred

**Payload**:
```typescript
{
  type: 'connection:error',
  message: string,
  code?: string,            // Error code (e.g., 'AUTH_REQUIRED')
  timestamp: string
}
```

---

## Rate Limiting

**Message Sending**: 10 messages per 60 seconds (per user)

**Error response**:
```typescript
{
  type: 'message:ack',
  messageId: string,
  status: 'error',
  error: 'Rate limit exceeded. Try again in X seconds'
}
```

**Handle gracefully**:
- Show toast notification with wait time
- Disable send button temporarily
- Update UI to show rate limit status

---

## Connection Lifecycle

### 1. Initial Connection

```typescript
import { getWebSocketClient } from '@/lib/websocket';

const client = getWebSocketClient({
  url: 'ws://localhost:5000/ws',
  reconnectionConfig: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000
  },
  autoConnect: false
});

// Listen for connection events
client.on('connection:established', () => {
  console.log('Connected to WebSocket');
});

client.on('connection:authenticated', (data) => {
  console.log('Authenticated:', data.connectionId);
  // Now safe to send messages
});

client.on('connection:error', (data) => {
  console.error('Connection error:', data.message);
  toast.error(data.message);
});

// Connect with JWT token (automatically pulled from TokenStorage)
client.connect();
```

---

### 2. Sending Messages

```typescript
const sendMessage = (content: string, conversationId: string) => {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add message to UI with 'sending' status
  addMessage({
    id: messageId,
    role: 'user',
    content,
    status: 'sending',
    timestamp: new Date()
  });

  // Send via WebSocket
  client.send('message:send', {
    messageId,
    conversationId,
    content,
    timestamp: new Date().toISOString()
  });
};
```

---

### 3. Receiving Messages

```typescript
// User messages (from other users or self)
client.on('message:receive', (data) => {
  addMessage({
    id: data.messageId,
    role: 'user',
    content: data.content,
    status: 'sent',
    timestamp: new Date(data.timestamp)
  });
});

// AI responses (streaming)
client.on('message:stream', (data) => {
  const existing = findMessage(data.messageId);

  if (!existing) {
    // First chunk - create new message
    addMessage({
      id: data.messageId,
      role: 'assistant',
      content: data.content,
      status: data.isComplete ? 'sent' : 'streaming',
      timestamp: new Date(data.timestamp)
    });
  } else {
    // Update existing message
    updateMessage(data.messageId, {
      content: data.content,  // Full content, not delta
      status: data.isComplete ? 'sent' : 'streaming'
    });
  }
});

// Message acknowledgments
client.on('message:ack', (data) => {
  updateMessage(data.messageId, {
    status: data.status === 'error' ? 'error' : 'sent',
    error: data.error
  });
});
```

---

### 4. Typing Indicators

```typescript
let typingTimeout: NodeJS.Timeout | null = null;

const handleInputChange = (value: string) => {
  setContent(value);

  // Send typing:start
  if (value.length > 0 && !typingTimeout) {
    client.send('typing:start', {
      conversationId: currentConversationId,
      timestamp: new Date().toISOString()
    });
  }

  // Auto-stop after 3 seconds of inactivity
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    client.send('typing:stop', {
      conversationId: currentConversationId,
      timestamp: new Date().toISOString()
    });
    typingTimeout = null;
  }, 3000);
};

// Listen for others typing
client.on('typing:start', (data) => {
  setIsOtherUserTyping(true);
});

client.on('typing:stop', (data) => {
  setIsOtherUserTyping(false);
});
```

---

### 5. Cleanup

```typescript
useEffect(() => {
  return () => {
    // Cleanup on unmount
    client.disconnect();
  };
}, []);
```

---

## Error Handling

### Common Errors

1. **AUTH_REQUIRED**: No JWT token provided
   - Redirect to login
   - Clear WebSocket connection

2. **AUTH_FAILED**: Invalid/expired JWT token
   - Attempt token refresh
   - Reconnect with new token
   - If refresh fails, redirect to login

3. **RATE_LIMIT**: Too many messages
   - Show toast with retry time
   - Temporarily disable send button

4. **VALIDATION_ERROR**: Invalid message format
   - Show error to user
   - Log for debugging

5. **INTERNAL_ERROR**: Server error
   - Show generic error message
   - Retry connection

---

## Message Queue During Disconnection

The WebSocket client automatically queues messages when disconnected:

```typescript
// Messages sent while disconnected are queued
sendMessage("Hello"); // Queued

// On reconnection, queued messages are sent automatically
client.on('reconnect:success', (data) => {
  console.log('Reconnected, sending queued messages');
  // Messages automatically sent
});
```

**Queue specs**:
- Max 100 messages
- FIFO order
- Overflow: oldest messages dropped

---

## Testing Checklist

- [ ] Connection with valid JWT
- [ ] Connection rejection with invalid JWT
- [ ] Send message and receive ack
- [ ] Receive messages from other users
- [ ] AI response streaming (token-by-token)
- [ ] Typing indicators (start/stop)
- [ ] Rate limit handling
- [ ] Disconnection and reconnection
- [ ] Message queuing during disconnection
- [ ] Auto-scroll during streaming
- [ ] Error handling for all scenarios

---

## File Locations

**Backend**:
- Server: `/src/websocket/server.ts`
- Message handlers: `/src/websocket/handlers/messageHandlers.ts`
- AI integration: `/src/websocket/handlers/aiIntegration.ts`
- Typing handlers: `/src/websocket/handlers/typingHandlers.ts`

**Frontend**:
- WebSocket client: `/client/src/lib/websocket.ts`
- Reconnection: `/client/src/lib/websocketReconnection.ts`
- Integration: `/client/src/pages/ChatPage.tsx` (to be implemented)

---

## Example: Complete Integration

See `/client/src/pages/ChatPage.tsx` for the full integration example after VBT-221 is complete.

---

**Created for**: VBT-222 through VBT-231
**Backend**: VBT-39 (WebSocket Server) - ✅ Complete
**Frontend**: VBT-221 (Real-time Streaming UI) - 🚧 In Progress
