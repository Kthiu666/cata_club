/**
 * Metadata carrier for `/student/attendance`. Nested under the `/student`
 * layout, whose title this one replaces.
 *
 * `title.absolute` — family portal, not the admin panel. See
 * `src/app/student/layout.tsx`.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Mis asistencias — Cata Club" },
};

export default function StudentAttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
