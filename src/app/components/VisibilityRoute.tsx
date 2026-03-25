/**
 * VisibilityRoute – Route-level visibility gate
 *
 * Used as a layout route wrapper in routes.ts to check page visibility
 * before rendering the child route component.
 */

import { Outlet, useLocation } from "react-router";
import { VisibilityGate } from "./VisibilityGate";

export function VisibilityRoute() {
  const location = useLocation();

  return (
    <VisibilityGate path={location.pathname}>
      <Outlet />
    </VisibilityGate>
  );
}
