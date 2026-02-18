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
import type * as billing from "../billing.js";
import type * as cleanup from "../cleanup.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as migration from "../migration.js";
import type * as migrations from "../migrations.js";
import type * as movements from "../movements.js";
import type * as notifications from "../notifications.js";
import type * as orderItems from "../orderItems.js";
import type * as orders from "../orders.js";
import type * as pos from "../pos.js";
import type * as procurement from "../procurement.js";
import type * as products from "../products.js";
import type * as repuestos from "../repuestos.js";
import type * as seed from "../seed.js";
import type * as telegram from "../telegram.js";
import type * as trabajosMantenimiento from "../trabajosMantenimiento.js";
import type * as uiConfig from "../uiConfig.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activos: typeof activos;
  analytics: typeof analytics;
  billing: typeof billing;
  cleanup: typeof cleanup;
  crons: typeof crons;
  http: typeof http;
  inventory: typeof inventory;
  migration: typeof migration;
  migrations: typeof migrations;
  movements: typeof movements;
  notifications: typeof notifications;
  orderItems: typeof orderItems;
  orders: typeof orders;
  pos: typeof pos;
  procurement: typeof procurement;
  products: typeof products;
  repuestos: typeof repuestos;
  seed: typeof seed;
  telegram: typeof telegram;
  trabajosMantenimiento: typeof trabajosMantenimiento;
  uiConfig: typeof uiConfig;
  users: typeof users;
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
