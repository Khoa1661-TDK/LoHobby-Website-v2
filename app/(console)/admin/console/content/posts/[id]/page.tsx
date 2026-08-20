// app/(console)/admin/console/content/posts/[id]/page.tsx
//
// Blog post editor (board 13b). Server component; the AppShell chrome comes
// from the group layout, so this page only supplies the content stack. The
// `id` is awaited from the Next 15 async params and handed to the editor; the
// data layer will resolve it.

import { notFound } from 'next/navigation';
import { PostEditor } from '@/components/console/content/PostEditor';
import { getPostEditorProps } from '@/lib/console/content';

export default async function PostEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostEditorProps(id);
  if (!post) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <PostEditor {...post} />
    </div>
  );
}
