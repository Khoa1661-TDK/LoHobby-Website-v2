import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import { ContentSection, PageShell, StorefrontPageHeader } from '@/components/layout/page';
import type { InfoPage } from '@/lib/info-pages';

export default function InfoPageLayout({ page }: { page: InfoPage }): ReactElement {
  return (
    <>
      <PageShell width="narrow">
        <ContentSection>
          <StorefrontPageHeader title={page.title} subtitle={page.description} />
          <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
            <p>{page.body}</p>
          </div>
        </ContentSection>
      </PageShell>
      <Footer />
    </>
  );
}
