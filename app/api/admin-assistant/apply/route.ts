// app/api/admin-assistant/apply/route.ts — execute a proposal the human confirmed.
// The body came back from the browser, so it is re-validated here before any write.
import config from '@payload-config';
import { revalidatePath } from 'next/cache';
import { getPayload } from 'payload';
import { runOrderAction } from '@/app/(payload)/admin/orders/actions';
import { applyProposal, parseProposal } from '@/lib/admin-assistant/apply';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';

export const runtime = 'nodejs';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config });
  if (!(await isAuthorizedAdmin(payload, request.headers))) {
    return json(401, { ok: false, message: 'Bạn không có quyền thực hiện thao tác này.' });
  }

  let body: { proposal?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json(400, { ok: false, message: 'Dữ liệu không hợp lệ.' });
  }

  const proposal = parseProposal(body.proposal);
  if (!proposal) return json(400, { ok: false, message: 'Đề xuất không hợp lệ.' });

  const locale: 'vi' | 'en' = body.locale === 'en' ? 'en' : 'vi';

  try {
    const result = await applyProposal(proposal, {
      payload,
      locale,
      runOrderAction: (docId, action, input) => runOrderAction(docId, action, input),
    });

    // runOrderAction revalidates the order paths itself; product and settings writes
    // need their own invalidation or the storefront keeps serving the cached version.
    if (result.ok && proposal.kind !== 'orderAction') {
      revalidatePath('/');
      if (proposal.kind === 'settingsUpdate') {
        revalidatePath(`/admin/globals/${proposal.global}`);
      } else {
        revalidatePath('/admin/collections/products');
        revalidatePath(`/admin/collections/products/${proposal.id}`);
      }
    }

    return json(result.ok ? 200 : 400, result);
  } catch (err) {
    return json(500, {
      ok: false,
      message: err instanceof Error ? err.message : 'Không thực hiện được thao tác.',
    });
  }
}
