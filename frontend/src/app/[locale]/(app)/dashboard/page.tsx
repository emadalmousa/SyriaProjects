import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard";
import { PageSpinner } from "@/components/ui";

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DashboardView />
    </Suspense>
  );
}
