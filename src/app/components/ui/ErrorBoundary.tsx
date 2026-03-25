/**
 * ErrorBoundary.tsx
 * Global error boundary that catches React render errors
 * and shows a premium-styled fallback UI matching the NAC design system.
 */

import React from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback. If not provided, the default NAC-styled fallback is shown. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      "%c[NAC Error Boundary]",
      "color:#CA0C85;font-weight:bold",
      error,
      info.componentStack
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="min-h-[60vh] flex items-center justify-center px-6"
          style={{ background: "var(--surface-0)" }}
        >
          <div
            className="max-w-md w-full p-8 text-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Icon */}
            <div
              className="w-14 h-14 mx-auto mb-5 flex items-center justify-center"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "12px",
              }}
            >
              <AlertTriangle size={24} style={{ color: "#f87171" }} />
            </div>

            {/* Title */}
            <h2
              className="text-white mb-2"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.8rem",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                fontWeight: 400,
              }}
            >
              Etwas ist schiefgelaufen
            </h2>

            {/* Message */}
            <p
              className="mb-6"
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.6,
              }}
            >
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut
              oder kehre zur Startseite zurueck.
            </p>

            {/* Error detail (dev only) */}
            {this.state.error && (
              <div
                className="mb-6 px-4 py-3 text-left overflow-auto"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.12)",
                  borderRadius: "4px",
                  maxHeight: "120px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "rgba(248,113,113,0.8)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-5 text-white transition-all duration-200 cursor-pointer active:scale-[0.98]"
                style={{
                  background: "var(--brand)",
                  border: "none",
                  minHeight: "44px",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--brand-light)";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(202,12,133,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--brand)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <RotateCcw size={13} />
                Erneut versuchen
              </button>

              <button
                onClick={this.handleHome}
                className="inline-flex items-center gap-2 px-5 text-white/60 hover:text-white/90 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  minHeight: "44px",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                }}
              >
                <Home size={13} />
                Startseite
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
