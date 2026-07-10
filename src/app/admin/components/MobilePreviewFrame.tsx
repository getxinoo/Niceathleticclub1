/**
 * MobilePreviewFrame – echte Mobile-Vorschau über ein iframe-Viewport.
 * ─────────────────────────────────────────────────────────────────────────────
 * Tailwind-Breakpoints sind VIEWPORT-basiert. Ein nur 390px breiter Container
 * im Desktop-Viewport rendert weiterhin die sm+-Zweige der öffentlichen
 * Komponenten — also ein gequetschtes Desktop-Layout, kein Mobile-Layout.
 * Erst ein echtes 390px-Viewport (iframe) aktiviert exakt die Mobile-Zweige,
 * die auch die öffentliche responsive Seite nutzt: gleiche Komponenten,
 * gleiches Markup, gleiche Styles — nur Breite/Breakpoint unterscheiden sich.
 *
 * Die React-Kinder werden per Portal in das iframe-Dokument gerendert; alle
 * Styles/Font-Links des Hauptdokuments werden hineingespiegelt (und per
 * MutationObserver aktuell gehalten, z. B. für Vite-injizierte Styles).
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function MobilePreviewFrame({
  width = 390,
  children,
}: {
  width?: number;
  children: React.ReactNode;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    doc.documentElement.style.background = "#050505";
    doc.body.style.margin = "0";
    doc.body.style.background = "#050505";

    const syncStyles = () => {
      doc.head.querySelectorAll("[data-nac-mirrored]").forEach((n) => n.remove());
      document.head
        .querySelectorAll('style, link[rel="stylesheet"], link[rel="preconnect"]')
        .forEach((node) => {
          const clone = node.cloneNode(true) as HTMLElement;
          clone.setAttribute("data-nac-mirrored", "1");
          doc.head.appendChild(clone);
        });
    };
    syncStyles();

    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true });

    setMountNode(doc.body);
    return () => {
      observer.disconnect();
      setMountNode(null);
    };
  }, []);

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Mobile-Vorschau (echtes 390px-Viewport)"
        style={{
          width: `${width}px`,
          height: "100%",
          border: "none",
          display: "block",
          margin: "0 auto",
          background: "#050505",
          boxShadow: "0 0 40px rgba(0,0,0,0.8)",
        }}
      />
      {mountNode && createPortal(children, mountNode)}
    </>
  );
}
