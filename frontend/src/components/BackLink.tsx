/**
 * BackLink ΓÇö shared in-page "back" navigation control.
 *
 * Always navigates to a fixed, known parent route via next/link, matching
 * the visual style already used in payments/forgot-password/reset-password
 * (ArrowLeft icon, size 14, strokeWidth 1.5).
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  href: string;
  label: string;
  className?: string;
}

export default function BackLink({ href, label, className }: BackLinkProps): React.ReactElement {
  return (
    <Link
      href={href}
      className={
        className ??
        "btn-ghost mb-6 -ml-2 inline-flex items-center gap-1 text-xs text-cata-text/65"
      }
    >
      <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
      {label}
    </Link>
  );
}
