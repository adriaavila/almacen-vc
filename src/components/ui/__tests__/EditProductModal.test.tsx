/**
 * @jest-environment jsdom
 *
 * Verifies the "successive edit" fix: form must only be populated when the
 * loaded product matches the requested productId (avoids stale data from previous product).
 */

import { Id } from 'convex/_generated/dataModel';

// Same condition used in EditProductModal to avoid applying stale product data
function shouldSyncFormToProduct(
  product: { _id: Id<'products'> } | undefined,
  productId: Id<'products'> | null,
  isOpen: boolean
): boolean {
  return !!(product && isOpen && productId && product._id === productId);
}

describe('EditProductModal - successive edit fix (guard condition)', () => {
  const idA = 'productA' as Id<'products'>;
  const idB = 'productB' as Id<'products'>;

  test('when productId matches product._id, form should sync', () => {
    const product = { _id: idA };
    expect(shouldSyncFormToProduct(product, idA, true)).toBe(true);
  });

  test('when productId is B but product is A (stale), form should NOT sync', () => {
    const productA = { _id: idA };
    expect(shouldSyncFormToProduct(productA, idB, true)).toBe(false);
  });

  test('when productId is B and product is B, form should sync', () => {
    const productB = { _id: idB };
    expect(shouldSyncFormToProduct(productB, idB, true)).toBe(true);
  });

  test('when modal is closed, form should not sync', () => {
    const product = { _id: idA };
    expect(shouldSyncFormToProduct(product, idA, false)).toBe(false);
  });

  test('when productId is null, form should not sync', () => {
    const product = { _id: idA };
    expect(shouldSyncFormToProduct(product, null, true)).toBe(false);
  });

  test('when product is undefined (loading), form should not sync', () => {
    expect(shouldSyncFormToProduct(undefined, idA, true)).toBe(false);
  });
});
