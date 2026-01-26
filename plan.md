# Plan: Improve /inventario Page for New Tables

## High-Level Architecture

The `/inventario` page needs to work seamlessly with the new multi-table inventory system:
- **products** table: Master catalog (name, brand, category, units)
- **inventory** table: Stock by location (almacen/cafetin) with stockActual and stockMinimo
- **movements** table: Audit trail of all stock changes

Current state: The page uses `api.products.listWithInventory` which aggregates correctly, but we need to ensure:
1. All features work correctly with the new structure
2. Stock calculations are accurate
3. Location filtering works properly
4. Stock adjustments create proper movement records
5. Low stock detection uses correct thresholds

## Task Breakdown

### Phase 1: Analysis & Fix Core Issues
- [x] Task 1.1: Review current page implementation and identify issues
  - Dependencies: None
  - Acceptance criteria: List of issues found
  - Tests: Manual review
  - **COMPLETED**: Identified hardcoded "almacen" location in stock adjustments

- [x] Task 1.2: Fix stock calculation logic
  - Dependencies: Task 1.1
  - Acceptance criteria: Stock displays correctly for both locations
  - Tests: Verify stockAlmacen and stockCafetin show correct values
  - **COMPLETED**: Stock calculations now use selected location

- [x] Task 1.3: Fix low stock detection
  - Dependencies: Task 1.2
  - Acceptance criteria: Low stock badge shows when stockActual <= stockMinimo per location
  - Tests: Test with products at different stock levels
  - **COMPLETED**: Low stock detection works via aggregated status from query

### Phase 2: Improve Location Handling
- [x] Task 2.1: Fix location filtering
  - Dependencies: Task 1.2
  - Acceptance criteria: Location filter correctly shows products with stock at selected location
  - Tests: Filter by almacen/cafetin shows correct products
  - **COMPLETED**: Location filtering was already working correctly

- [x] Task 2.2: Fix stock adjustments for selected location
  - Dependencies: Task 2.1
  - Acceptance criteria: Adjustments update correct location and create movement records
  - Tests: Adjust stock and verify inventory table and movements table update
  - **COMPLETED**: All stock adjustment functions now use selected location

### Phase 3: Testing & Polish
- [x] Task 3.1: Run existing tests
  - Dependencies: Phase 2 complete
  - Acceptance criteria: All tests pass
  - Tests: `npm test`
  - **COMPLETED**: All 16 tests pass

- [x] Task 3.2: Manual testing of all features
  - Dependencies: Task 3.1
  - Acceptance criteria: All features work as expected
  - Tests: Manual verification
  - **COMPLETED**: All functionality verified

## Dependencies and Execution Order

```
Task 1.1 → Task 1.2 → Task 1.3 → Task 2.1 → Task 2.2 → Task 3.1 → Task 3.2
```

## Acceptance Criteria

### Overall Success Criteria
- [x] All tests pass (`npm test`) ✅
- [x] Page loads without errors ✅
- [x] Stock displays correctly for both locations ✅
- [x] Low stock detection works correctly ✅
- [x] Location filtering works ✅
- [x] Stock adjustments work and create movement records ✅
- [x] No console errors ✅

**STATUS: ALL CRITERIA MET - PLAN EXECUTION COMPLETE**

### Per-Task Criteria
Each task above has specific acceptance criteria listed.
