// app/(console)/admin/console/crawl/page.tsx
//
// Crawl launcher + live progress. This is ONE screen in two states:
//   - board 3 (JobLauncher)  — the idle launcher form, rendered here
//   - board 4 (JobProgress)  — the SAME route while a job runs (running state)
// The AppShell chrome comes from the group layout, so this page supplies
// content only. Server component; the running board is inert until wired to
// live data.
//
// JobProgress is intentionally NOT re-exported from here: a Next.js page may
// only export `default` plus a fixed set of route names, and re-exporting a
// component fails the build. It is imported from its own module instead.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { JobLauncher } from '@/components/console/crawl/JobLauncher';

export default function CrawlPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Khởi chạy crawl Shopee" />

      {/* Board 3 — idle launcher (current state). Board 4 (JobProgress) is the
          running state of this same route, rendered in place of this when a job
          is in flight. */}
      <JobLauncher />
    </div>
  );
}
