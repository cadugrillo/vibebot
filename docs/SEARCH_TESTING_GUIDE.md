# Search Testing Guide
**VBT-244: Real-time Search with Debouncing**

## 🚀 Quick Start

### 1. Start the Servers

```bash
# Terminal 1 - Backend
cd /Users/cadugrillo/Typescript/vibebot
npm run dev

# Terminal 2 - Frontend
cd /Users/cadugrillo/Typescript/vibebot/client
npm run dev
```

### 2. Access the Test Page

1. Open browser: http://localhost:5173
2. Login with your credentials
3. Navigate to: **http://localhost:5173/search-test**

## 📋 Test Scenarios

### Test 1: Debouncing (300ms delay)
**What to test:** Search waits 300ms after you stop typing

**Steps:**
1. Go to "Integrated Search" tab
2. Type "hello" quickly
3. Notice: Spinner appears 300ms AFTER you stop typing, not immediately
4. Type more text: "hello world" - watch the timer reset

**Expected:** Search request only happens 300ms after you stop typing

---

### Test 2: Min Character Requirement
**What to test:** Minimum 2 characters required

**Steps:**
1. Type only "a" (1 character)
2. Observe the warning message: "Type at least 2 characters to search"
3. Type "ab" (2 characters)
4. Search should trigger

**Expected:** Warning for 1 char, search triggers at 2+ chars

---

### Test 3: Request Cancellation
**What to test:** Old requests get cancelled when new ones start

**Steps:**
1. Open DevTools → Network tab
2. Type "test" slowly (letter by letter with pauses)
3. Before the search completes, type "hello" quickly
4. Check Network tab - the "test" request should be cancelled (red)

**Expected:** Old "test" request shows as cancelled, only "hello" request completes

---

### Test 4: Loading States
**What to test:** Loading spinner shows during search

**Steps:**
1. Type at least 2 characters
2. Watch for the spinner icon (⟳) in the search bar
3. Loading state should show ONLY during the actual API call

**Expected:**
- Spinner appears while searching
- Spinner disappears when results load
- Input is NOT disabled during search

---

### Test 5: Empty State
**What to test:** Clearing search clears results immediately

**Steps:**
1. Type "test" and wait for results
2. Click the X button (clear)
3. Results should disappear immediately (no delay)

**Expected:** Results clear instantly when search is cleared

---

### Test 6: Error Handling
**What to test:** Errors display properly

**Steps:**
1. Stop the backend server (Ctrl+C in Terminal 1)
2. Try to search
3. Should see error message

**Expected:** Red error message appears explaining the failure

---

### Test 7: Search Results Display
**What to test:** Results show correctly with highlighting

**Steps:**
1. Type a search query that matches conversations
2. Check that results show:
   - Conversation title
   - Snippet with matched text
   - Timestamp
   - Highlighted matches (yellow background)

**Expected:** Results display with proper formatting and highlights

---

### Test 8: State Inspector (Advanced)
**What to test:** Hook state updates correctly

**Steps:**
1. Go to "Custom Hook Test" tab
2. Type in the search box
3. Watch the "Hook State Inspector" panel below
4. Observe:
   - `query` updates immediately as you type
   - `debouncedQuery` updates 300ms after you stop
   - `isLoading` toggles during search
   - `results count` updates when search completes
   - `executionTime` shows how long search took

**Expected:** All state values update correctly and in sync

---

## 🧪 Backend API Testing (Optional)

If you want to test the backend API directly:

```bash
# Get your access token from localStorage (in browser DevTools)
# Then test the search endpoint:

curl -X GET "http://localhost:3000/api/conversations/search?q=test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🐛 Debugging Tips

### Check Browser DevTools
1. **Console:** See any JavaScript errors
2. **Network:** See search requests being made/cancelled
3. **Application → localStorage:** Check auth tokens

### Check Backend Logs
Watch Terminal 1 for backend logs:
- Search requests
- Query parameters
- Response times
- Any errors

### Common Issues

**Issue:** "401 Unauthorized"
- **Fix:** Make sure you're logged in. Check localStorage for `vibebot_access_token`

**Issue:** "No results found"
- **Fix:** Make sure you have conversations with messages in the database

**Issue:** Search not debouncing
- **Fix:** Check DevTools console for errors. Rebuild frontend: `npm run build`

**Issue:** Page doesn't load
- **Fix:** Make sure both backend (port 3000) and frontend (port 5173) are running

## 📊 Performance Metrics to Watch

**Good Performance:**
- Debounce delay: ~300ms
- API response time: <100ms for small datasets
- UI remains responsive during search
- No memory leaks after repeated searches

**Bad Signs:**
- Debounce delay inconsistent
- Multiple requests for same query
- UI freezes during search
- Memory usage keeps growing

## ✅ Success Criteria

All these should work:
- ✅ 300ms debounce delay
- ✅ Min 2 characters enforced
- ✅ Old requests cancelled
- ✅ Loading states show correctly
- ✅ Empty state clears results
- ✅ Errors display properly
- ✅ Results display with highlights
- ✅ State updates correctly

## 🎯 Next Steps

After testing VBT-244, you'll move to:
- **VBT-245:** Search Results Display with Highlighting (enhance result display)
- **VBT-246:** Date Range Filter Component
- **VBT-247:** Model Filter Component

---

**Questions?** Check the code in:
- `client/src/hooks/useSearch.ts` - The search hook
- `client/src/components/search/SearchContainer.tsx` - Container component
- `client/src/lib/api/search.ts` - API client
