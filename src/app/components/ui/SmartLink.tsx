/**
 * SmartLink.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Polymorphic link wrapper for CMS-editable cards/boxes/buttons/images.
 *
 * Given an optional `PageLink` (see lib/links.ts):
 *  • internal → renders a React Router <Link>
 *  • external → renders a plain <a> (optionally target="_blank" with a safe rel)
 *  • none / invalid → renders the container element with NO click behavior
 *    (never `href="#"`, never an empty onClick handler)
 *
 * This is a new, additive component. It is not yet imported by any existing
 * page or block, so it changes no current output. It exists so upcoming card
 * editors/renderers all get identical, safe link handling from one place
 * instead of re-implementing the internal/external/none branching per block.
 */

import type { ReactNode, CSSProperties } from "react";
import { Link } from "react-router";
import type { PageLink } from "../../../lib/links";
import { isClickable } from "../../../lib/links";

interface SmartLinkProps {
  link?: PageLink | null;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Element to render when there is no (valid) link. Defaults to "div". */
  as?: "div" | "span";
  onClick?: () => void;
}

export function SmartLink({ link, children, className, style, as = "div", onClick }: SmartLinkProps) {
  if (link && isClickable(link)) {
    if (link.kind === "internal") {
      return (
        <Link to={link.path} className={className} style={style} onClick={onClick}>
          {children}
        </Link>
      );
    }
    if (link.kind === "external") {
      return (
        <a
          href={link.url}
          className={className}
          style={style}
          onClick={onClick}
          {...(link.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {children}
        </a>
      );
    }
  }

  // No link / invalid link → plain, non-interactive container. No href="#".
  const Tag = as;
  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  );
}
