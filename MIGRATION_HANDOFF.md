# Migration Handoff Document

## 🎯 Purpose
This document provides everything needed to continue migrating the WFM application to use the new utilities, constants, and services layer.

---

## ✅ What's Already Done

### Infrastructure (Complete)
- ✅ `src/constants/` - All constants defined
- ✅ `src/services/` - 8 service modules created
- ✅ `src/utils/` - 70+ utility functions
- ✅ Zod validation schemas
- ✅ 80 tests passing
- ✅ Documentation complete

### Migrated Files (3)
1. ✅ `src/lib/AuthContext.tsx` - Uses authService
2. ✅ `src/pages/Login.tsx` - Zod validation + constants
3. ✅ `src/pages/Signup.tsx` - Zod validation + constants

---

## 📋 Files That Need Migration

### Priority 1: Core Feature Pages (High Impact)

#### 1. `src/pages/Dashboard.tsx`
**Current Issues:**
- Direct Supabase calls for swap/leave requests
- Hardcoded table names
- Manual data fetching

**Migration Tasks:**
```typescript
// Replace this:
const { data } = await supabase.from('swap_requests').select(...)

// With this:
import { swapRequestsService, leaveRequestsService } from '../services'
const data = await swapRequestsService.getSwapRequests()
```

**Estimated Impact:** High - Main landing page

---

#### 2. `src/pages/Schedule.tsx`
**Current Issues:**
- Direct Supabase calls for shifts
- Manual date formatting
- Hardcoded shift types

**Migration Tasks:**
```typescript
// Replace with:
import { shiftsService } from '../services'
import { formatDate, formatDateISO } from '../utils'
import { DATE_FORMATS } from '../constants'

const shifts = await shiftsService.getShifts(startDate, endDate)
const formatted = formatDate(date, DATE_FORMATS.DISPLAY)
```

**Estimated Impact:** High - Core feature

---

#### 3. `src/pages/LeaveRequests.tsx`
**Current Issues:**
- Direct Supabase calls
- Manual status filtering
- Hardcoded routes

**Migration Tasks:**
```typescript
import { leaveRequestsService } from '../services'
import { ROUTES } from '../constants'

const requests = await leaveRequestsService.getLeaveRequests()
navigate(ROUTES.LEAVE_REQUESTS_CREATE)
```

**Estimated Impact:** High - Core feature

---

#### 4. `src/pages/SwapRequests.tsx`
**Current Issues:**
- Direct Supabase calls
- Manual filtering
- Hardcoded routes

**Migration Tasks:**
```typescript
import { swapRequestsService } from '../services'
import { ROUTES } from '../constants'

const requests = await swapRequestsService.getSwapRequests()
```

**Estimated Impact:** High - Core feature

---

#### 5. `src/pages/Settings.tsx`
**Current Issues:**
- Direct Supabase calls for settings
- Manual toggle handling

**Migration Tasks:**
```typescript
import { settingsService } from '../services'

const settings = await settingsService.getAllSettings()
await settingsService.updateSetting('key', 'value')
```

**Estimated Impact:** Medium - Admin feature

---

### Priority 2: Detail Pages (Medium Impact)

#### 6. `src/pages/LeaveRequestDetail.tsx`
**Migration Tasks:**
- Use `leaveRequestsService.getLeaveRequestById()`
- Use `commentsService` for comments
- Use `formatDate()` for dates
- Use constants for routes and messages

---

#### 7. `src/pages/SwapRequestDetail.tsx`
**Migration Tasks:**
- Use `swapRequestsService.getSwapRequestById()`
- Use `commentsService` for comments
- Use `formatDate()` for dates
- Use constants for routes and messages

---

#### 8. `src/pages/CreateLeaveRequest.tsx`
**Migration Tasks:**
- Add Zod validation with `leaveRequestSchema`
- Use `leaveRequestsService.createLeaveRequest()`
- Use `leaveBalancesService` for balance checks
- Use constants for messages

**Validation Example:**
```typescript
import { leaveRequestSchema } from '../utils/validators'

const result = leaveRequestSchema.safeParse(formData)
if (!result.success) {
  setError(result.error.issues[0].message)
  return
}
```

---

#### 9. `src/pages/CreateSwapRequest.tsx`
**Migration Tasks:**
- Add Zod validation with `swapRequestSchema`
- Use `swapRequestsService.createSwapRequest()`
- Use `shiftsService` for shift data
- Use constants for messages

---

### Priority 3: Admin Features (Lower Impact)

#### 10. `src/pages/LeaveBalances.tsx`
**Migration Tasks:**
- Use `leaveBalancesService`
- Use CSV helpers for bulk upload
- Use formatters for balance display

---

#### 11. `src/pages/ScheduleUpload.tsx`
**Migration Tasks:**
- Use `csvHelpers.validateAndParseCSV()`
- Use `shiftsService.bulkUpsertShifts()`
- Use constants for file size limits

**CSV Example:**
```typescript
import { validateAndParseCSV } from '../utils'
import { FILE_UPLOAD } from '../constants'

const result = await validateAndParseCSV(file)
if (result.success) {
  await shiftsService.bulkUpsertShifts(result.data)
}
```

---

#### 12. `src/pages/Reports.tsx`
**Migration Tasks:**
- Use date helpers for date ranges
- Use formatters for numbers/percentages
- Use services for data fetching
- Use `downloadCSV()` for exports

---

#### 13. Headcount Pages
- `src/pages/Headcount/EmployeeDirectory.tsx`
- `src/pages/Headcount/EmployeeDetail.tsx`
- `src/pages/Headcount/HeadcountDashboard.tsx`

**Migration Tasks:**
- Use `headcountService`
- Use formatters for FTE, phone numbers
- Use constants for employee statuses

---

### Priority 4: Hooks (If Time Permits)

#### Custom Hooks to Update:
- `src/hooks/useSwapRequests.ts` - Use swapRequestsService
- `src/hooks/useLeaveRequests.ts` - Use leaveRequestsService
- `src/hooks/useSettings.ts` - Use settingsService
- `src/hooks/useHeadcount.ts` - Use headcountService

**Note:** These hooks wrap React Query, so migration is optional but recommended.

---

## 🔧 Migration Patterns (Quick Reference)

### Pattern 1: Service Migration
```typescript
// BEFORE
const { data, error } = await supabase
  .from('table_name')
  .select('*')
if (error) throw error

// AFTER
import { serviceNameService } from '../services'
const data = await serviceNameService.getItems()
```

### Pattern 2: Constants
```typescript
// BEFORE
navigate('/dashboard')
setError('Network error')

// AFTER
import { ROUTES, ERROR_MESSAGES } from '../constants'
navigate(ROUTES.DASHBOARD)
setError(ERROR_MESSAGES.NETWORK)
```

### Pattern 3: Date Formatting
```typescript
// BEFORE
format(new Date(date), 'MMM dd, yyyy')

// AFTER
import { formatDate } from '../utils'
formatDate(date)
```

### Pattern 4: Validation
```typescript
// BEFORE
if (!field) {
  setError('Field required')
  return
}

// AFTER
import { schemaName } from '../utils/validators'
const result = schemaName.safeParse(data)
if (!result.success) {
  setError(result.error.issues[0].message)
  return
}
```

---

## 📊 Migration Checklist Per File

For each file you migrate:

### 1. Imports
- [ ] Add service imports
- [ ] Add constant imports
- [ ] Add utility imports
- [ ] Add validator imports (if form)

### 2. Replace Code
- [ ] Replace Supabase calls with service methods
- [ ] Replace hardcoded strings with constants
- [ ] Replace manual formatting with utilities
- [ ] Add Zod validation to forms

### 3. Testing
- [ ] Run `npm run test:run` (should pass 80/80)
- [ ] Run `npm run build` (should succeed)
- [ ] Test in dev server manually
- [ ] Check for TypeScript errors

### 4. Commit
- [ ] `git add .`
- [ ] `git commit -m "refactor: Migrate [filename] to use services/utils"`
- [ ] `git push origin main`

---

## 🚀 Quick Start Commands

```bash
# Test everything
npm run test:run

# Build
npm run build

# Dev server
npm run dev

# Commit changes
git add .
git commit -m "refactor: Migrate [files] to use new patterns"
git push origin main
```

---

## 📚 Available Resources

### Services
- `authService` - Authentication
- `shiftsService` - Shift management
- `swapRequestsService` - Swap requests
- `leaveRequestsService` - Leave requests
- `leaveBalancesService` - Leave balances
- `commentsService` - Comments
- `settingsService` - Settings
- `headcountService` - Employee management

### Constants
- `ROUTES` - All application routes
- `ERROR_MESSAGES` - Error messages
- `SUCCESS_MESSAGES` - Success messages
- `DATE_FORMATS` - Date format strings
- `PAGINATION` - Page sizes
- `FILE_UPLOAD` - File limits
- `VALIDATION` - Validation rules
- `API_ENDPOINTS` - Table names

### Utilities
- **Date Helpers**: `formatDate`, `getDaysBetween`, `isValidDateRange`, etc.
- **Formatters**: `formatCurrency`, `formatFTE`, `formatPhoneNumber`, etc.
- **Validators**: `loginSchema`, `leaveRequestSchema`, `swapRequestSchema`, etc.
- **CSV Helpers**: `parseCSV`, `arrayToCSV`, `downloadCSV`, `validateAndParseCSV`

### Documentation
- `IMPLEMENTATION_SUMMARY.md` - Complete overview
- `DEVELOPER_GUIDE.md` - Usage examples
- `CHANGES_LOG.md` - Change history
- `MIGRATION_PROGRESS.md` - Current status

---

## ⚠️ Important Notes

### Don't Break Existing Functionality
- Test after each migration
- Keep commits small and focused
- Run tests frequently
- Build before committing

### Backward Compatibility
- Old code still works
- No need to migrate everything at once
- Can mix old and new patterns temporarily

### When in Doubt
- Check `DEVELOPER_GUIDE.md` for examples
- Look at already-migrated files (Login, Signup, AuthContext)
- Run tests to verify changes
- Build to check for TypeScript errors

---

## 📈 Expected Results

### After Full Migration:
- **Cleaner code** - Less boilerplate
- **Type-safe** - Zod validation everywhere
- **Consistent** - Same patterns throughout
- **Maintainable** - Easy to update
- **Testable** - Services are mockable

### Metrics to Track:
- Lines of code reduced
- Number of direct Supabase calls eliminated
- Number of hardcoded values replaced
- Test coverage maintained (80/80)

---

## 🎯 Success Criteria

A file is successfully migrated when:
1. ✅ No direct Supabase calls (uses services)
2. ✅ No hardcoded strings (uses constants)
3. ✅ Forms have Zod validation
4. ✅ Dates use formatters
5. ✅ All tests pass
6. ✅ Build succeeds
7. ✅ No TypeScript errors

---

## 📞 Need Help?

### Check These First:
1. `DEVELOPER_GUIDE.md` - Usage examples
2. `IMPLEMENTATION_SUMMARY.md` - Overview
3. Already migrated files - Login.tsx, Signup.tsx, AuthContext.tsx

### Common Issues:
- **Zod errors**: Use `result.error.issues[0]` not `result.error.errors[0]`
- **Service imports**: Import from `'../services'` not individual files
- **Constants**: Import what you need, not everything
- **Date formatting**: Use `formatDate()` with optional format parameter

---

## 🏁 Final Notes

### Current State:
- ✅ Infrastructure complete (utils, services, constants)
- ✅ 3 files migrated (Auth, Login, Signup)
- ✅ 80 tests passing
- ✅ Build successful
- ✅ Documentation complete

### Next Steps:
1. Migrate Dashboard (highest impact)
2. Migrate Schedule (core feature)
3. Migrate request pages (LeaveRequests, SwapRequests)
4. Migrate detail pages
5. Migrate admin features

### Estimated Time:
- **Dashboard**: 15-20 minutes
- **Schedule**: 20-25 minutes
- **Request pages**: 15 minutes each
- **Detail pages**: 10 minutes each
- **Admin features**: 10-15 minutes each

**Total remaining**: ~3-4 hours for complete migration

---

**Created**: February 7, 2026  
**Status**: Ready for continuation  
**Priority**: Start with Dashboard.tsx  
**Contact**: Check documentation files for guidance
