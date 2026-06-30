import type { Material, User, UserRole } from "@/lib/types";

export type AppPermissions = {
  canDelete: boolean;
  canManageColaboradores: boolean;
  canManageCatalog: boolean;
  canEditCatalogPrices: boolean;
  canAccessInventario: boolean;
  canAccessFinanzas: boolean;
};

const ADMIN_PERMISSIONS: AppPermissions = {
  canDelete: true,
  canManageColaboradores: true,
  canManageCatalog: true,
  canEditCatalogPrices: true,
  canAccessInventario: true,
  canAccessFinanzas: true,
};

const COLABORADOR_BASE: AppPermissions = {
  canDelete: false,
  canManageColaboradores: false,
  canManageCatalog: false,
  canEditCatalogPrices: false,
  canAccessInventario: false,
  canAccessFinanzas: false,
};

export function getPermissionsForUser(user: Pick<User, "role" | "canEditCatalogPrices">): AppPermissions {
  if (user.role === "admin") return ADMIN_PERMISSIONS;
  return {
    ...COLABORADOR_BASE,
    canEditCatalogPrices: Boolean(user.canEditCatalogPrices),
  };
}

export function getPermissions(role: UserRole): AppPermissions {
  return getPermissionsForUser({ role, canEditCatalogPrices: role === "admin" });
}

export const ADMIN_ONLY_PATHS = ["/colaboradores", "/usuarios", "/inventario", "/finanzas", "/obras"];

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPriceOnlyMaterialUpdate(existing: Material, incoming: Material): boolean {
  return (
    existing.codigo === incoming.codigo &&
    existing.nombre === incoming.nombre &&
    existing.unidad === incoming.unidad &&
    existing.categoria === incoming.categoria
  );
}

export function canModifyMaterial(
  user: Pick<User, "role" | "canEditCatalogPrices">,
  existing: Material | null,
  incoming: Material,
): boolean {
  const permissions = getPermissionsForUser(user);
  if (permissions.canManageCatalog) return true;
  if (!permissions.canEditCatalogPrices) return false;
  if (!incoming.id || !existing) return false;
  return isPriceOnlyMaterialUpdate(existing, incoming);
}
