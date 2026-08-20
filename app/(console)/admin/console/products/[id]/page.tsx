// app/(console)/admin/console/products/[id]/page.tsx
//
// Product editor (board 7, wireframe). Server component; the AppShell chrome
// comes from the group layout, so this page only supplies the content stack.

import { notFound } from 'next/navigation';
import { ProductEditor } from '@/components/console/products/ProductEditor';
import { getProductEditorFacts } from '@/lib/console/products';

export default async function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const facts = await getProductEditorFacts(id);
  if (!facts) notFound();

  return (
    <div className="flex h-full flex-col">
      <ProductEditor facts={facts} />
    </div>
  );
}
