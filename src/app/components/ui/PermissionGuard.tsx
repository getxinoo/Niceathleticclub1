/**
 * PermissionGuard.tsx – Conditional rendering based on permissions
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   <PermissionGuard require="members.write">
 *     <button>Bearbeiten</button>
 *   </PermissionGuard>
 *
 *   <PermissionGuard requireAny={["finances.read", "finances.write"]} fallback={<AccessDenied />}>
 *     <FinancePanel />
 *   </PermissionGuard>
 */

import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { PermissionKey } from '../../../lib/permissions';

interface PermissionGuardProps {
  /** Single permission required */
  require?: PermissionKey;
  /** Any of these permissions grants access */
  requireAny?: PermissionKey[];
  /** All of these permissions required */
  requireAll?: PermissionKey[];
  /** Fallback when permission is denied (default: null = hidden) */
  fallback?: ReactNode;
  /** If true, renders disabled version instead of hiding */
  disableInstead?: boolean;
  children: ReactNode;
}

export function PermissionGuard({
  require: requireSingle,
  requireAny,
  requireAll,
  fallback = null,
  disableInstead = false,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = true;

  if (requireSingle) {
    hasAccess = hasPermission(requireSingle);
  } else if (requireAny && requireAny.length > 0) {
    hasAccess = hasAnyPermission(...requireAny);
  } else if (requireAll && requireAll.length > 0) {
    hasAccess = hasAllPermissions(...requireAll);
  }

  if (hasAccess) return <>{children}</>;

  if (disableInstead) {
    return (
      <div style={{ opacity: 0.4, pointerEvents: 'none', cursor: 'not-allowed' }}>
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
}

export default PermissionGuard;
