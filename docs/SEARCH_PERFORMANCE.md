# Search Performance Optimization

**VBT-240: Performance Optimization**

## Current Implementation

The search functionality uses Prisma's `contains` query with case-insensitive mode for full-text search across conversation titles and message content.

### Database Indexes

**Optimized for search (added in VBT-240):**
- `conversations.title` - B-tree index for fast title matching
- `conversations.model` - B-tree index for model filtering
- `conversations.userId` - Existing index for access control
- `conversations.createdAt` - Existing index for date filtering
- `messages.conversationId` - Existing index for joins
- `messages.createdAt` - Existing index for date filtering

**Not indexed:**
- `messages.content` - Large text field, standard B-tree index not recommended

## Performance Characteristics

### Current Approach (Prisma contains)
- **Pros**:
  - Simple implementation, no additional dependencies
  - Works well for datasets up to ~100K messages
  - Case-insensitive search built-in

- **Cons**:
  - Not optimized for very large text fields
  - No relevance ranking from database
  - Can be slow with millions of messages

### Search Limits

To maintain performance:
- Maximum 100 results per search term
- Maximum 1000 total results returned
- Search query limited to 200 characters
- Page size limited to 100 results

### Execution Time Monitoring

Search execution time is tracked and returned with each response:
```json
{
  "executionTime": 45  // milliseconds
}
```

## Future Optimizations

### For Production with Large Datasets (>1M messages)

Consider implementing one of the following:

#### Option 1: PostgreSQL Full-Text Search
Add `tsvector` columns with GIN indexes:

```sql
-- Add tsvector column
ALTER TABLE messages ADD COLUMN content_search tsvector;

-- Create trigger to maintain tsvector
CREATE TRIGGER messages_search_update
BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(content_search, 'pg_catalog.english', content);

-- Create GIN index
CREATE INDEX messages_content_search_idx ON messages USING GIN(content_search);
```

**Pros**: Native PostgreSQL, no external dependencies
**Cons**: Requires raw SQL, Prisma doesn't fully support tsvector

#### Option 2: Elasticsearch / OpenSearch
Sync data to Elasticsearch for advanced full-text search:

**Pros**:
- Industry-standard search engine
- Advanced features (fuzzy matching, synonyms, etc.)
- Scales to billions of documents

**Cons**:
- Additional infrastructure
- Data synchronization complexity
- Higher operational cost

#### Option 3: MeiliSearch
Lightweight, fast search engine:

**Pros**:
- Easy to set up and deploy
- Fast search with typo tolerance
- Built-in relevance ranking

**Cons**:
- Additional service to maintain
- Data synchronization needed

#### Option 4: Typesense
Modern search engine alternative:

**Pros**:
- Fast and easy to use
- Good relevance out of the box
- Lower resource usage than Elasticsearch

**Cons**:
- Additional service
- Smaller community

## Performance Monitoring

### Key Metrics to Track

1. **Search Execution Time**
   - Target: <100ms for p50, <500ms for p95
   - Current: Measured and returned in response

2. **Database Query Time**
   - Use Prisma's query logging
   - Monitor slow queries (>100ms)

3. **Result Set Size**
   - Track average number of matches
   - Monitor empty result rate

4. **Cache Hit Rate** (if implementing caching)
   - Target: >70% cache hit rate
   - Reduces database load

### Recommended Tools

- **Prisma Studio** - Visual database browser
- **pgAdmin** - PostgreSQL administration
- **DataDog / New Relic** - APM for production monitoring
- **Grafana + Prometheus** - Open-source monitoring

## Caching Strategy (Future Enhancement)

For frequently searched queries, implement Redis caching:

```typescript
// Pseudo-code
const cacheKey = `search:${userId}:${query}:${filters}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const results = await SearchService.searchConversations(...);
await redis.setex(cacheKey, 300, JSON.stringify(results)); // 5 min TTL

return results;
```

**Cache Invalidation:**
- Invalidate user's search cache when messages are added
- Use TTL (Time To Live) to auto-expire cached results
- Pattern-based invalidation for related queries

## Current Performance Benchmarks

*To be added after load testing*

Expected performance on standard hardware (8GB RAM, SSD):
- 10K messages: <50ms average search time
- 100K messages: <200ms average search time
- 1M messages: <1000ms average search time (needs optimization)

## Recommendations for MVP

1. **Current implementation is sufficient** for:
   - Up to 100,000 total messages
   - Up to 10,000 conversations
   - Moderate search frequency (<1000 searches/hour)

2. **Monitor and optimize** when:
   - Search times exceed 500ms consistently
   - Database CPU usage >70%
   - User complaints about slow search

3. **Plan migration** to advanced search when:
   - Total messages exceed 500K
   - Search is a core feature with high usage
   - Advanced features needed (fuzzy search, synonyms, etc.)

## Database Maintenance

### Regular Maintenance Tasks

1. **VACUUM** - Reclaim space and update statistics
   ```sql
   VACUUM ANALYZE conversations;
   VACUUM ANALYZE messages;
   ```

2. **REINDEX** - Rebuild indexes for optimal performance
   ```sql
   REINDEX TABLE conversations;
   REINDEX TABLE messages;
   ```

3. **Statistics Update** - Help query planner
   ```sql
   ANALYZE conversations;
   ANALYZE messages;
   ```

Frequency: Weekly for active databases

---

**Last Updated**: 2025-11-04
**Task**: VBT-240 (Performance Optimization)
