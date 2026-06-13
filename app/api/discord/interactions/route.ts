// app/api/discord/interactions/route.ts — public Discord interactions endpoint
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { verifyDiscordSignature } from '@/lib/discord/verify';
import { getDiscordConfig } from '@/lib/discord/client';
import { confirmOrder } from '@/lib/order-fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PONG = { type: 1 };

function ephemeral(content: string) {
  return NextResponse.json({ type: 4, data: { content, flags: 64 } });
}

function updateMessage(content: string) {
  // type 7 = UPDATE_MESSAGE: replace the original, drop the button.
  return NextResponse.json({ type: 7, data: { content, embeds: [], components: [] } });
}

export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get('X-Signature-Ed25519') ?? '';
  const timestamp = req.headers.get('X-Signature-Timestamp') ?? '';
  const rawBody = await req.text();

  const payload = await getPayload({ config });
  const discord = await getDiscordConfig(payload);

  const valid = verifyDiscordSignature({
    rawBody,
    signature,
    timestamp,
    publicKey: discord.publicKey,
  });
  if (!valid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as {
    type: number;
    data?: { custom_id?: string };
    member?: { user?: { id?: string } };
  };

  if (interaction.type === 1) {
    return NextResponse.json(PONG);
  }

  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id ?? '';
    if (!customId.startsWith('confirm_order:')) {
      return ephemeral('Hành động không hợp lệ.');
    }

    const userId = interaction.member?.user?.id ?? '';
    if (!discord.allowedUserIds.includes(userId)) {
      return ephemeral('Bạn không có quyền xác nhận đơn này.');
    }

    const docId = customId.slice('confirm_order:'.length);
    const result = await confirmOrder(docId);
    if (!result.ok) {
      return updateMessage(`⚠️ ${result.message}`);
    }
    return updateMessage(`✅ Đã xác nhận đơn #${result.order.orderCode}.`);
  }

  return NextResponse.json({ error: 'unsupported interaction type' }, { status: 400 });
}
