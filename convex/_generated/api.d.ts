/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activos from "../activos.js";
import type * as analytics from "../analytics.js";
import type * as items from "../items.js";
import type * as orderItems from "../orderItems.js";
import type * as orders from "../orders.js";
import type * as repuestos from "../repuestos.js";
import type * as seed from "../seed.js";
import type * as stockMovements from "../stockMovements.js";
import type * as trabajosMantenimiento from "../trabajosMantenimiento.js";
import type * as uiConfig from "../uiConfig.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activos: typeof activos;
  analytics: typeof analytics;
  items: typeof items;
  orderItems: typeof orderItems;
  orders: typeof orders;
  repuestos: typeof repuestos;
  seed: typeof seed;
  stockMovements: typeof stockMovements;
  trabajosMantenimiento: typeof trabajosMantenimiento;
  uiConfig: typeof uiConfig;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
