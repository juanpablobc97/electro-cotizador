import type { UserRole } from "@/lib/types";

export type AppPermissions = {
  canDelete: boolean;
  canManageColaboradores: boolean;
  canManageCatalog: boolean;
  canAccessInventario: boolean;
  canAccessFinanzas: boolean;
};

const ROLE_PERMISSIONS: Record<UserRole, AppPermissions> = {
  admin: {
    canDelete: true,
    canManageColaboradores: true,
    canManageCatalog: true,
    canAccessInventario: true,
    canAccessFinanzas: true,
  },
  colaborador: {
    canDelete: false,
    canManageColaboradores: false,
    canManageCatalog: false,
    canAccessInventario: false,
    canAccessFinanzas: false,
  },
};

export function getPermissions(role: UserRole): AppPermissions {
  return ROLE_PERMISSIONS[role];
}

export const ADMIN_ONLY_PATHS = ["/colaboradores", "/usuarios", "/inventario", "/finanzas"];

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
