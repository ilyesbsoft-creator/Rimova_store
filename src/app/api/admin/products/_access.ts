import type { NextRequest } from "next/server";

import { requireAdmin } from "@/backend/modules/admin-auth/adminAuth.middleware";
import type { AdminRole } from "@/backend/modules/admin-auth/adminAuth.repository";

/**
 * Super admin only.
 */
export const SUPER_ADMIN_ROLES: AdminRole[] = [
  "super_admin",
];

/**
 * Super admin and admin.
 */
export const ADMIN_ROLES: AdminRole[] = [
  "super_admin",
  "admin",
];

/**
 * Super admin, admin, and manager.
 */
export const MANAGER_ROLES: AdminRole[] = [
  "super_admin",
  "admin",
  "manager",
];

/**
 * All administrative roles.
 */
export const ALL_ADMIN_ROLES: AdminRole[] = [
  "super_admin",
  "admin",
  "manager",
  "support",
];

/**
 * Require super admin access.
 */
export function requireSuperAdmin(request: NextRequest) {
  return requireAdmin(request, SUPER_ADMIN_ROLES);
}

/**
 * Require admin-level access.
 */
export function requireAdminAccess(request: NextRequest) {
  return requireAdmin(request, ADMIN_ROLES);
}

/**
 * Require manager-level access.
 */
export function requireManagerAccess(request: NextRequest) {
  return requireAdmin(request, MANAGER_ROLES);
}

/**
 * Require access for any administrative role.
 */
export function requireProductAdmin(request: NextRequest) {
  return requireAdmin(request, ALL_ADMIN_ROLES);
}