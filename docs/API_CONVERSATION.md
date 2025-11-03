# Conversation Management API

This document describes the REST API endpoints for managing conversations in VibeBot.

## Base URL

```
http://localhost:3000/api/conversations
```

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Rate Limiting

- **Create/Update/Delete operations**: 10 requests per minute
- **Read operations**: 30 requests per minute

## Endpoints

### 1. Create Conversation

Create a new conversation for the authenticated user.

**Endpoint**: `POST /api/conversations`

**Request Body**:
```json
{
  "title": "My Conversation",           // Optional, defaults to "New Conversation"
  "model": "claude-sonnet-4",           // Optional
  "systemPrompt": "You are helpful"     // Optional
}
```

**Response** (201 Created):
```json
{
  "message": "Conversation created successfully",
  "data": {
    "id": "clxxxxxxxxxxxxxxxxx",
    "userId": "cluserid123456789",
    "title": "My Conversation",
    "model": "claude-sonnet-4",
    "systemPrompt": "You are helpful",
    "createdAt": "2025-11-02T12:00:00.000Z",
    "updatedAt": "2025-11-02T12:00:00.000Z"
  }
}
```

**Errors**:
- `400` - Validation error (title too long, etc.)
- `401` - Unauthorized (no/invalid token)
- `429` - Rate limit exceeded

---

### 2. List Conversations

Get all conversations for the authenticated user with pagination and sorting.

**Endpoint**: `GET /api/conversations`

**Query Parameters**:
| Parameter   | Type   | Default      | Description                                    |
|-------------|--------|--------------|------------------------------------------------|
| `page`      | number | 1            | Page number (1-indexed)                        |
| `pageSize`  | number | 20           | Items per page (max: 100)                      |
| `sortBy`    | string | createdAt    | Sort field: `createdAt`, `updatedAt`, `title`  |
| `sortOrder` | string | desc         | Sort order: `asc` or `desc`                    |

**Example Request**:
```
GET /api/conversations?page=1&pageSize=10&sortBy=title&sortOrder=asc
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "clxxxxxxxxxxxxxxxxx",
      "userId": "cluserid123456789",
      "title": "Conversation 1",
      "model": "claude-sonnet-4",
      "systemPrompt": null,
      "createdAt": "2025-11-02T12:00:00.000Z",
      "updatedAt": "2025-11-02T12:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

**Errors**:
- `400` - Invalid query parameters
- `401` - Unauthorized
- `429` - Rate limit exceeded

---

### 3. Get Single Conversation

Retrieve a specific conversation by ID.

**Endpoint**: `GET /api/conversations/:id`

**Path Parameters**:
- `id` - Conversation ID (CUID format)

**Response** (200 OK):
```json
{
  "data": {
    "id": "clxxxxxxxxxxxxxxxxx",
    "userId": "cluserid123456789",
    "title": "My Conversation",
    "model": "claude-sonnet-4",
    "systemPrompt": "You are helpful",
    "createdAt": "2025-11-02T12:00:00.000Z",
    "updatedAt": "2025-11-02T12:00:00.000Z"
  }
}
```

**Errors**:
- `400` - Invalid conversation ID format
- `401` - Unauthorized
- `403` - Forbidden (conversation belongs to another user)
- `404` - Conversation not found
- `429` - Rate limit exceeded

---

### 4. Update Conversation

Update an existing conversation. All fields are optional (partial update).

**Endpoint**: `PUT /api/conversations/:id`

**Path Parameters**:
- `id` - Conversation ID (CUID format)

**Request Body**:
```json
{
  "title": "Updated Title",               // Optional
  "model": "claude-opus-4",               // Optional
  "systemPrompt": "Updated prompt"        // Optional
}
```

**Note**: At least one field must be provided.

**Response** (200 OK):
```json
{
  "message": "Conversation updated successfully",
  "data": {
    "id": "clxxxxxxxxxxxxxxxxx",
    "userId": "cluserid123456789",
    "title": "Updated Title",
    "model": "claude-opus-4",
    "systemPrompt": "Updated prompt",
    "createdAt": "2025-11-02T12:00:00.000Z",
    "updatedAt": "2025-11-02T12:05:00.000Z"
  }
}
```

**Errors**:
- `400` - Validation error (no fields provided, title too long, etc.)
- `401` - Unauthorized
- `403` - Forbidden (conversation belongs to another user)
- `404` - Conversation not found
- `429` - Rate limit exceeded

---

### 5. Delete Conversation

Delete a conversation and all associated messages (cascade delete).

**Endpoint**: `DELETE /api/conversations/:id`

**Path Parameters**:
- `id` - Conversation ID (CUID format)

**Response** (204 No Content):
```
(empty body)
```

**Errors**:
- `400` - Invalid conversation ID format
- `401` - Unauthorized
- `403` - Forbidden (conversation belongs to another user)
- `404` - Conversation not found
- `429` - Rate limit exceeded

---

## Validation Rules

### Title
- **Min Length**: 1 character (if provided)
- **Max Length**: 200 characters
- **Optional**: Yes (defaults to "New Conversation")

### Model
- **Min Length**: 1 character (if provided)
- **Max Length**: 100 characters
- **Optional**: Yes

### System Prompt
- **Max Length**: 10,000 characters
- **Optional**: Yes

### Conversation ID
- **Format**: Valid CUID (e.g., `clxxxxxxxxxxxxxxxxx`)
- **Required**: Yes (for get/update/delete operations)

---

## Authorization

All endpoints enforce ownership checks:

- Users can **only** access their own conversations
- Attempting to access another user's conversation returns `403 Forbidden`
- Non-existent conversations return `404 Not Found` (to prevent info leakage)

---

## Pagination Details

### Default Values
- **Page**: 1
- **Page Size**: 20
- **Max Page Size**: 100

### Pagination Metadata
- `currentPage` - Current page number
- `pageSize` - Items per page
- `totalItems` - Total number of conversations
- `totalPages` - Total number of pages
- `hasNext` - Boolean indicating if next page exists
- `hasPrevious` - Boolean indicating if previous page exists

### Edge Cases
- If `page` exceeds total pages, an empty array is returned with correct pagination metadata
- If `pageSize` exceeds 100, it's clamped to 100
- Negative values for `page` or `pageSize` are corrected to minimums (1)

---

## Sorting Details

### Allowed Sort Fields
- `createdAt` - Conversation creation timestamp
- `updatedAt` - Last update timestamp
- `title` - Conversation title

### Sort Order
- `asc` - Ascending order
- `desc` - Descending order (default)

### Invalid Sort Fields
Providing an invalid `sortBy` field returns a validation error.

---

## Examples

### Create a Conversation with Defaults
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### List First Page (10 items)
```bash
curl -X GET "http://localhost:3000/api/conversations?page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

### Sort by Title (Ascending)
```bash
curl -X GET "http://localhost:3000/api/conversations?sortBy=title&sortOrder=asc" \
  -H "Authorization: Bearer <token>"
```

### Get Specific Conversation
```bash
curl -X GET http://localhost:3000/api/conversations/clxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer <token>"
```

### Update Conversation Title
```bash
curl -X PUT http://localhost:3000/api/conversations/clxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Title"}'
```

### Delete Conversation
```bash
curl -X DELETE http://localhost:3000/api/conversations/clxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer <token>"
```

---

## Testing

Run integration tests:
```bash
# Make sure server is running (npm run dev)
npm run test:conversation-api
```

Tests cover:
- ✅ Create with defaults and custom values
- ✅ List with pagination and sorting
- ✅ Get single conversation
- ✅ Update partial fields
- ✅ Delete with cascade
- ✅ Authorization (403 for other users)
- ✅ Validation errors (400)
- ✅ Not found errors (404)
- ✅ Unauthorized access (401)

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Conversation IDs use CUID format for security and uniqueness
- Deleting a conversation cascades to delete all associated messages
- The `userId` field is automatically set from the authenticated user
