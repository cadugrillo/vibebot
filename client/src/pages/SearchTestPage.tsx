/**
 * SearchTestPage
 * Comprehensive test page for search functionality
 * VBT-244: Real-time Search with Debouncing
 *
 * This page demonstrates and tests all search features:
 * - Debounced search (300ms)
 * - Request cancellation
 * - Loading states
 * - Min character requirement (2 chars)
 * - Empty states
 * - Error handling
 * - Global vs conversation-specific search
 * - Filters (date range, model)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchContainer, DateRangeFilter, ModelFilter, SearchModeToggle, SearchHistory } from '@/components/search';
import { useSearch } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResults } from '@/components/search/SearchResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, FileSearch, MessageSquare, Zap, Filter } from 'lucide-react';
import type { SearchFilters, SearchMode } from '@/components/search/types';
export default function SearchTestPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chat')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Search Functionality Test</h1>
              <p className="text-sm text-muted-foreground">
                VBT-244: Real-time Search with Debouncing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Feature Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Features</CardTitle>
            <CardDescription>
              Test all implemented search functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-sm">300ms Debouncing</div>
                  <div className="text-xs text-muted-foreground">
                    Waits for you to stop typing
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileSearch className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Min 2 Characters</div>
                  <div className="text-xs text-muted-foreground">
                    Type at least 2 chars to search
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Request Cancellation</div>
                  <div className="text-xs text-muted-foreground">
                    Type fast to see old requests cancelled
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Filter className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Advanced Filters</div>
                  <div className="text-xs text-muted-foreground">
                    Date range and model filters
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Tabs */}
        <Tabs defaultValue="integrated" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="integrated">
              Integrated Search
            </TabsTrigger>
            <TabsTrigger value="custom">
              Custom Hook Test
            </TabsTrigger>
            <TabsTrigger value="conversation">
              Conversation Search
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Integrated SearchContainer */}
          <TabsContent value="integrated" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SearchContainer Component</CardTitle>
                <CardDescription>
                  Ready-to-use component with SearchBar + SearchResults + useSearch hook
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SearchContainer
                  mode="all"
                  onSelectResult={(convId, msgId) => {
                    console.log('Result clicked:', { convId, msgId });
                    alert(`Conversation: ${convId}\nMessage: ${msgId || 'N/A'}`);
                  }}
                  placeholder="Search all conversations..."
                  emptyMessage="No conversations match your search"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Testing Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">1. Test Debouncing (300ms)</h4>
                  <p className="text-sm text-muted-foreground">
                    Type quickly in the search box. Notice the search doesn't happen until
                    300ms after you stop typing. Watch the spinner appear after the delay.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">2. Test Min Characters</h4>
                  <p className="text-sm text-muted-foreground">
                    Type only 1 character. You should see a warning message.
                    Type 2+ characters to trigger search.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">3. Test Request Cancellation</h4>
                  <p className="text-sm text-muted-foreground">
                    Type "test", wait 200ms, then type "hello" quickly.
                    The first request should be cancelled. Check browser DevTools Network tab.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">4. Test Empty State</h4>
                  <p className="text-sm text-muted-foreground">
                    Clear the search box completely. Results should clear immediately.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Custom Hook Test */}
          <TabsContent value="custom" className="space-y-4">
            <CustomHookTest />
          </TabsContent>

          {/* Tab 3: Conversation-Specific Search */}
          <TabsContent value="conversation" className="space-y-4">
            <SearchModeTest />
          </TabsContent>
        </Tabs>

        {/* Debug Panel */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Debug Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline">Network</Badge>
              <span className="text-muted-foreground">
                Open DevTools → Network tab to see search requests and cancellations
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">Console</Badge>
              <span className="text-muted-foreground">
                Click on search results to see console logs with conversation/message IDs
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">Timing</Badge>
              <span className="text-muted-foreground">
                Watch the execution time displayed below search results
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Custom Hook Test Component
 * Shows manual usage of useSearch hook with all state exposed
 */
function CustomHookTest() {
  const [showRelevanceScore, setShowRelevanceScore] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showHistory, setShowHistory] = useState(false);

  const search = useSearch({
    mode: 'all',
    debounceDelay: 300,
    minChars: 2,
    autoSearch: true,
    initialFilters: filters,
  });

  const searchHistory = useSearchHistory();

  // Add to history when search completes with results
  useEffect(() => {
    if (
      search.debouncedQuery &&
      search.debouncedQuery.length >= 2 &&
      !search.isLoading &&
      !search.error &&
      search.results.length > 0
    ) {
      searchHistory.addToHistory(search.debouncedQuery, search.results.length);
    }
  }, [search.debouncedQuery, search.isLoading, search.error, search.results.length, searchHistory]);

  // ESC keyboard shortcut to clear search
  // VBT-250: Clear and Reset Functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (search.query || Object.keys(filters).length > 0)) {
        search.clearAll();
        setFilters({});
        setShowHistory(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search, filters]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>useSearch Hook - Manual Usage</CardTitle>
              <CardDescription>
                Direct hook usage with all state exposed for testing
              </CardDescription>
            </div>
            {/* Toggle for relevance scores */}
            <div className="flex items-center gap-2">
              <label htmlFor="show-score" className="text-sm text-muted-foreground cursor-pointer">
                Show Scores
              </label>
              <input
                id="show-score"
                type="checkbox"
                checked={showRelevanceScore}
                onChange={(e) => setShowRelevanceScore(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <SearchBar
              value={search.query}
              onChange={(value) => {
                search.setQuery(value);
                setShowHistory(value.length === 0);
              }}
              onClear={() => {
                search.clearSearch();
                setShowHistory(true);
              }}
              isLoading={search.isLoading}
              placeholder="Type to search (manual hook test)..."
            />

            {/* Search History - shown when input is empty and has focus */}
            {showHistory && search.query.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-10">
                <SearchHistory
                  history={searchHistory.history}
                  onSelectHistory={(query) => {
                    search.setQuery(query);
                    setShowHistory(false);
                  }}
                  onRemoveItem={searchHistory.removeFromHistory}
                  onClearAll={searchHistory.clearHistory}
                />
              </div>
            )}
          </div>

          {/* History Toggle Button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </Button>
            <span className="text-xs text-muted-foreground">
              ({searchHistory.history.length} items in history)
            </span>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filters:</span>
              <DateRangeFilter
                value={filters.dateRange}
                onChange={(dateRange) => {
                  const newFilters = { ...filters, dateRange };
                  setFilters(newFilters);
                  search.setFilters(newFilters);
                }}
              />
              <ModelFilter
                value={filters.model}
                onChange={(model) => {
                  const newFilters = { ...filters, model };
                  setFilters(newFilters);
                  search.setFilters(newFilters);
                }}
              />
            </div>

            {/* Clear All Button - VBT-250 */}
            {(search.query || filters.dateRange || filters.model) && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    search.clearAll();
                    setFilters({});
                    setShowHistory(true);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  Clear All (ESC)
                </Button>
                <span className="text-xs text-muted-foreground">
                  Clears search query and all filters
                </span>
              </div>
            )}
          </div>

          {/* Search Results */}
          {search.query.length > 0 && (
            <SearchResults
              results={search.results}
              isLoading={search.isLoading}
              query={search.query}
              onSelectResult={(convId, msgId) => {
                console.log('Selected:', { convId, msgId });
              }}
              showRelevanceScore={showRelevanceScore}
            />
          )}

          {/* Error Display */}
          {search.error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              Error: {search.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* State Inspector */}
      <Card>
        <CardHeader>
          <CardTitle>Hook State Inspector</CardTitle>
          <CardDescription>Live view of all hook state values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <div className="text-muted-foreground mb-1">query:</div>
              <div className="bg-muted p-2 rounded">
                "{search.query}" ({search.query.length} chars)
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">debouncedQuery:</div>
              <div className="bg-muted p-2 rounded">
                "{search.debouncedQuery}"
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">isLoading:</div>
              <div className="bg-muted p-2 rounded">
                {search.isLoading ? '✅ true' : '❌ false'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">results count:</div>
              <div className="bg-muted p-2 rounded">
                {search.results.length} matches
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">executionTime:</div>
              <div className="bg-muted p-2 rounded">
                {search.executionTime !== null ? `${search.executionTime}ms` : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">error:</div>
              <div className="bg-muted p-2 rounded truncate">
                {search.error || 'null'}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground mb-1">pagination:</div>
              <div className="bg-muted p-2 rounded">
                {search.pagination
                  ? `Page ${search.pagination.page}/${search.pagination.totalPages} (${search.pagination.totalResults} total)`
                  : 'null'}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground mb-1">filters.dateRange:</div>
              <div className="bg-muted p-2 rounded font-mono text-xs">
                {filters.dateRange
                  ? `from: ${filters.dateRange.from || 'null'}, to: ${filters.dateRange.to || 'null'}`
                  : 'null'}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground mb-1">filters.model:</div>
              <div className="bg-muted p-2 rounded font-mono text-xs">
                {filters.model || 'null'}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground mb-1">search history:</div>
              <div className="bg-muted p-2 rounded font-mono text-xs">
                {searchHistory.history.length} items
                {searchHistory.history.length > 0 && (
                  <span className="ml-2 text-primary">
                    (latest: "{searchHistory.history[0].query}")
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Search Mode Test Component
 * Demonstrates conversation-specific search with mode toggle
 * VBT-248: Conversation-Specific Search Mode
 */
function SearchModeTest() {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [showRelevanceScore, setShowRelevanceScore] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  // Mock conversation for demonstration
  const mockConversationId = 'demo-conversation-123';
  const mockConversationTitle = 'Building a React Dashboard with AI';

  const search = useSearch({
    mode: searchMode,
    conversationId: searchMode === 'conversation' ? mockConversationId : undefined,
    debounceDelay: 300,
    minChars: 2,
    autoSearch: true,
    initialFilters: filters,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search Mode Toggle</CardTitle>
          <CardDescription>
            Switch between searching all conversations or a specific conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Mode Toggle */}
          <SearchModeToggle
            mode={searchMode}
            onModeChange={setSearchMode}
            conversationTitle={searchMode === 'conversation' ? mockConversationTitle : undefined}
          />

          <Separator />

          {/* Search Input */}
          <SearchBar
            value={search.query}
            onChange={search.setQuery}
            onClear={search.clearSearch}
            isLoading={search.isLoading}
            placeholder={
              searchMode === 'all'
                ? 'Search all conversations...'
                : `Search in "${mockConversationTitle}"...`
            }
          />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Filters:</span>
            <DateRangeFilter
              value={filters.dateRange}
              onChange={(dateRange) => {
                const newFilters = { ...filters, dateRange };
                setFilters(newFilters);
                search.setFilters(newFilters);
              }}
            />
            <ModelFilter
              value={filters.model}
              onChange={(model) => {
                const newFilters = { ...filters, model };
                setFilters(newFilters);
                search.setFilters(newFilters);
              }}
            />
          </div>

          {/* Relevance Score Toggle */}
          <div className="flex items-center gap-2">
            <label htmlFor="show-score-mode" className="text-sm text-muted-foreground cursor-pointer">
              Show relevance scores
            </label>
            <input
              id="show-score-mode"
              type="checkbox"
              checked={showRelevanceScore}
              onChange={(e) => setShowRelevanceScore(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 cursor-pointer"
            />
          </div>

          {/* Search Results */}
          {search.query.length > 0 && (
            <SearchResults
              results={search.results}
              isLoading={search.isLoading}
              query={search.query}
              onSelectResult={(convId, msgId) => {
                console.log('Selected:', { convId, msgId, mode: searchMode });
                alert(
                  `Mode: ${searchMode}\nConversation: ${convId}\nMessage: ${msgId || 'N/A'}`
                );
              }}
              showRelevanceScore={showRelevanceScore}
            />
          )}

          {/* Error Display */}
          {search.error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              Error: {search.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">1. Test Mode Toggle</h4>
            <p className="text-sm text-muted-foreground">
              Click the toggle buttons to switch between "All Conversations" and "Current Conversation".
              Notice the conversation context appears when in conversation mode.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium text-sm">2. Search Behavior</h4>
            <p className="text-sm text-muted-foreground">
              In "All Conversations" mode, search uses <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /api/conversations/search</code>.
              In "Current Conversation" mode, it uses <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /api/conversations/:id/search</code>.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium text-sm">3. Visual Indicators</h4>
            <p className="text-sm text-muted-foreground">
              The selected mode is highlighted in the toggle.
              The conversation title is shown below when searching within a conversation.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium text-sm">4. Integration with Main App</h4>
            <p className="text-sm text-muted-foreground">
              In the actual chat interface, the search mode toggle will be integrated into the sidebar,
              and the conversation mode will automatically use the currently selected conversation.
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => navigate('/chat')}
            >
              Go to Chat Page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mode State Inspector */}
      <Card>
        <CardHeader>
          <CardTitle>Mode State Inspector</CardTitle>
          <CardDescription>Live view of search mode state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <div className="text-muted-foreground mb-1">searchMode:</div>
              <div className="bg-muted p-2 rounded font-semibold">
                {searchMode === 'all' ? '🌍 all' : '💬 conversation'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">conversationId:</div>
              <div className="bg-muted p-2 rounded truncate">
                {searchMode === 'conversation' ? mockConversationId : 'null'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">endpoint:</div>
              <div className="bg-muted p-2 rounded text-xs truncate">
                {searchMode === 'all'
                  ? '/api/conversations/search'
                  : `/api/conversations/${mockConversationId}/search`}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">results count:</div>
              <div className="bg-muted p-2 rounded">
                {search.results.length} matches
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
