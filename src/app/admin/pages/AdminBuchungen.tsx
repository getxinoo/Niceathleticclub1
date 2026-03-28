/**
 * AdminBuchungen.tsx
 * Leitet auf /admin/kurse?tab=buchungen weiter.
 * Die Buchungsverwaltung ist jetzt als Tab in AdminKurse integriert.
 */
import { Navigate } from "react-router";

export default function AdminBuchungen() {
  return <Navigate to="/admin/kurse?tab=buchungen" replace />;
}
