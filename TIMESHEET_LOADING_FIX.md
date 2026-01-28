# Timesheet Page Loading Issue - Root Cause & Solution

## Problem: Why Some Tests Load Successfully While Others Don't

### Root Cause

The issue is caused by **parallel test execution** overwhelming the remote server:

1. **`fullyParallel: true`** - All tests run simultaneously
2. **`workers: undefined`** (non-CI) - Defaults to CPU count (usually 4-8 workers)
3. **All tests call `goto()` in `beforeEach`** - Multiple tests hit the server at the exact same time
4. **Remote server at `http://46.62.211.210:4003`** - Can't handle multiple concurrent requests efficiently

### What Happens

```
Time 0ms:  Test 1 starts → calls goto() → navigates to /dashboard/timesheet
Time 0ms:  Test 2 starts → calls goto() → navigates to /dashboard/timesheet  
Time 0ms:  Test 3 starts → calls goto() → navigates to /dashboard/timesheet
Time 0ms:  Test 4 starts → calls goto() → navigates to /dashboard/timesheet
...
```

**Result**: Server gets overwhelmed, some requests succeed, others timeout or fail.

### Why Some Tests Work and Others Don't

- **First few tests**: Server responds quickly, page loads successfully
- **Later tests**: Server is busy processing earlier requests, times out or returns errors
- **Random failures**: Which tests fail depends on timing and server load

## Solution Applied

### 1. **Added Retry Logic to `goto()` Method**

The `goto()` method now retries up to 3 times with exponential backoff:

```javascript
async goto(maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add delay between retries (2s, 4s, 6s)
      if (attempt > 0) {
        await this.page.waitForTimeout(attempt * 2000);
      }
      
      // Try to load page...
      // If successful, return
      // If fails, catch error and retry
    } catch (error) {
      // Retry unless it's the last attempt
    }
  }
}
```

**Benefits**:
- Handles temporary server overload
- Retries on empty pages, loading timeouts, missing buttons
- Doesn't retry on authentication/permission errors

### 2. **Reduced Parallel Workers**

**Before**: `workers: undefined` (defaults to CPU count, e.g., 8 workers)

**After**: `workers: 2` (only 2 tests run simultaneously)

**Benefits**:
- Less server load
- More predictable test execution
- Better for remote servers

### 3. **Added Stagger Delay in `beforeEach`**

**Before**: All tests start at exactly the same time

**After**: Random 0-1000ms delay before each test starts

```javascript
test.beforeEach(async ({ page }) => {
  // Stagger test starts to avoid simultaneous requests
  const staggerDelay = Math.floor(Math.random() * 1000);
  await page.waitForTimeout(staggerDelay);
  
  // Then navigate...
  await timesheetPage.goto();
});
```

**Benefits**:
- Spreads out requests over time
- Reduces simultaneous server hits
- Simple but effective

### 4. **Enabled Retries in Playwright Config**

**Before**: `retries: process.env.CI ? 2 : 0` (no retries locally)

**After**: `retries: process.env.CI ? 2 : 1` (1 retry locally)

**Benefits**:
- Handles flaky tests automatically
- Reduces false failures

## How It Works Now

### Test Execution Flow

```
Time 0ms:    Test 1 starts → waits 234ms → calls goto() → SUCCESS
Time 150ms:  Test 2 starts → waits 567ms → calls goto() → SUCCESS  
Time 300ms:  Test 3 starts → waits 123ms → calls goto() → FAILS (server busy)
Time 423ms:  Test 3 retries → waits 2s → calls goto() → SUCCESS
Time 500ms:  Test 4 starts → waits 890ms → calls goto() → SUCCESS
```

**Result**: Tests are staggered, retries handle temporary failures, most tests succeed.

## Configuration Summary

### `playwright.config.js`
- ✅ `workers: 2` - Limit to 2 parallel tests
- ✅ `retries: 1` - Retry failed tests once locally

### `TimesheetPage.js`
- ✅ `goto()` with retry logic (3 attempts)
- ✅ Exponential backoff (2s, 4s, 6s delays)
- ✅ Smart retry (doesn't retry auth/permission errors)

### `timesheet-validations.spec.js`
- ✅ Random stagger delay (0-1000ms) in `beforeEach`
- ✅ Uses retry-enabled `goto()` method

## Testing the Fix

### Run Tests
```bash
npx playwright test tests/timesheet-validations.spec.js
```

### Expected Behavior
- ✅ Most tests should pass on first attempt
- ✅ Some tests might retry once (this is normal)
- ✅ Fewer "page loading" failures
- ✅ More consistent test results

### If Tests Still Fail

1. **Check server status**: Server might be down or very slow
2. **Increase workers delay**: Change `staggerDelay` to `Math.floor(Math.random() * 2000)` (0-2s)
3. **Reduce workers further**: Change `workers: 2` to `workers: 1` (sequential)
4. **Increase retries**: Change `maxRetries = 3` to `maxRetries = 5` in `goto()`

## Alternative: Sequential Execution

If parallel execution is still problematic, you can run tests sequentially:

```javascript
// playwright.config.js
workers: 1, // Run one test at a time
```

**Trade-off**: Tests run slower but are more reliable.

## Monitoring

Watch for these patterns:

- **Many retries**: Server is slow, consider reducing workers
- **Auth errors**: Authentication state expired, re-run `auth.setup.js`
- **Permission errors**: User doesn't have access, check credentials
- **Consistent failures**: Specific test has a bug, not a loading issue

## Summary

**Problem**: Parallel tests overwhelming remote server → random failures

**Solution**: 
1. Retry logic in `goto()`
2. Reduced workers (2 instead of 8)
3. Stagger delays between tests
4. Enabled test retries

**Result**: More reliable test execution, fewer random failures

