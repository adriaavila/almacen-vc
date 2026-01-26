# Testing Guide - Inventory Dashboard

This document outlines the testing strategy and test cases for the high-density Inventory Management Dashboard.

## Test Coverage

### Unit Tests
- Component rendering
- User interactions
- Form validation
- Keyboard navigation
- State management

### Integration Tests
- Full workflows
- Component interactions
- Data flow
- Error handling

### Manual Testing Checklist

## Desktop Functionality Tests

### Sidebar Tests
- [x] Sidebar renders with all navigation items
- [x] Sidebar collapses to icons-only (64px width)
- [x] Sidebar expands to full width (256px) with labels
- [x] Toggle button works correctly
- [x] Active route is highlighted
- [x] Smooth transitions work
- [x] State persists in localStorage

### Inventory Table Tests
- [x] Table renders with all products
- [x] Column headers are correct
- [x] Stock values display in editable inputs
- [x] Low stock rows (< 5) have red background
- [x] Active row has blue border and background
- [x] Row height is limited to 40px
- [x] Product Name column has fixed width (200px)

### Keyboard Navigation Tests
- [x] Enter key moves focus to next row
- [x] Down Arrow moves focus to next row
- [x] Up Arrow moves focus to previous row
- [x] Navigation wraps from last to first row
- [x] Active row highlighting updates on navigation

### Form Functionality Tests
- [x] Stock values can be edited
- [x] Form shows "dirty" state when values change
- [x] Save button appears when form is dirty
- [x] Cancel button resets form to original values
- [x] Form submission updates stock via Convex
- [x] Validation prevents negative values
- [x] Complex quantity helper text displays

## Mobile Functionality Tests

### Sidebar Tests
- [x] Hamburger menu button appears on mobile
- [x] Sidebar slides in as drawer from left
- [x] Overlay backdrop appears and closes drawer on click
- [x] Close button works on mobile
- [x] Drawer closes on navigation

### Table Tests
- [x] Table allows horizontal scrolling
- [x] Product Name column is sticky during horizontal scroll
- [x] Sticky column has proper z-index and shadow
- [x] All columns remain accessible via scroll
- [x] Touch interactions work correctly

## Integration Tests

### Full Workflow Tests
- [x] Navigate to inventory page
- [x] Edit multiple stock values
- [x] Navigate between rows using keyboard
- [x] Save all changes
- [x] Verify changes persist
- [x] Cancel changes and verify reset

### Error Handling Tests
- [x] Network errors show user-friendly message
- [x] Invalid input values are prevented
- [x] Empty product list handled gracefully
- [x] Loading states display correctly

## Cross-Browser Compatibility

### Chrome
- [ ] Sidebar collapse/expand works
- [ ] Keyboard navigation works
- [ ] Sticky column works on mobile
- [ ] Form submission works
- [ ] No console errors

### Firefox
- [ ] Sidebar collapse/expand works
- [ ] Keyboard navigation works
- [ ] Sticky column works on mobile
- [ ] Form submission works
- [ ] No console errors

### Safari
- [ ] Sidebar collapse/expand works
- [ ] Keyboard navigation works
- [ ] Sticky column works on mobile
- [ ] Form submission works
- [ ] No console errors

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- InventoryGrid.test.tsx
```

## Test Files

- `src/components/admin/__tests__/InventoryGrid.test.tsx` - Inventory table component tests
- `src/components/admin/__tests__/AdminSidebar.test.tsx` - Sidebar component tests
- `src/app/admin/dashboard/inventario/__tests__/page.test.tsx` - Page integration tests

## Manual Testing Instructions

### Desktop Testing
1. Open the application in a desktop browser (1920x1080 or larger)
2. Navigate to `/admin/dashboard/inventario`
3. Test sidebar collapse/expand functionality
4. Test keyboard navigation in the table
5. Edit stock values and save
6. Verify low stock highlighting
7. Test active row highlighting

### Mobile Testing
1. Open browser DevTools and set viewport to mobile (375x667)
2. Navigate to `/admin/dashboard/inventario`
3. Test hamburger menu and drawer
4. Test horizontal scrolling in table
5. Verify sticky first column
6. Test touch interactions

### Cross-Browser Testing
1. Test in Chrome, Firefox, and Safari
2. Verify all features work consistently
3. Check for console errors
4. Verify responsive breakpoints

## Known Issues

None at this time.

## Future Test Improvements

- Add E2E tests with Playwright
- Add visual regression tests
- Add performance tests
- Add accessibility tests with axe-core
