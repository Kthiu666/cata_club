"use client";

import { useState, type ReactNode } from "react";

interface ContextualHelpProps {
  title: string;
  children: ReactNode;
}

export default function ContextualHelp({ title, children }: ContextualHelpProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `contextual-help-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={(): void => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={title}
        className="text-xs font-medium text-cata-red hover:text-cata-red-light"
      >
        {isOpen ? "Ocultar ayuda" : "Ver ayuda"}
      </button>
      {isOpen && (
        <section
          id={panelId}
          role="region"
          aria-label={title}
          className="mt-2 rounded-lg border border-cata-border bg-cata-bg p-3 text-xs leading-relaxed text-cata-text/65"
        >
          {children}
        </section>
      )}
    </div>
  );
}
