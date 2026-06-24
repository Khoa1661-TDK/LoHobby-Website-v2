// scripts/discord-register-commands.ts — register guild-scoped slash commands.
// Run: node_modules/.bin/tsx scripts/discord-register-commands.ts
import { getPayload } from 'payload';
import config from '@payload-config';
import { getDiscordConfig } from '@/lib/discord/client';

const COMMANDS = [
  {
    name: 'orders',
    description: 'Liệt kê đơn hàng gần đây',
    options: [
      {
        name: 'status',
        description: 'Lọc theo trạng thái',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'Tất cả', value: 'all' },
          { name: 'Chờ xử lý', value: 'pending' },
          { name: 'Đang xử lý', value: 'processing' },
          { name: 'Đang giao', value: 'shipped' },
          { name: 'Đã giao', value: 'delivered' },
          { name: 'Đã hủy', value: 'canceled' },
        ],
      },
      { name: 'limit', description: 'Số đơn (tối đa 25)', type: 4, required: false }, // INTEGER
    ],
  },
  {
    name: 'order',
    description: 'Xem chi tiết một đơn hàng',
    options: [{ name: 'code', description: 'Mã đơn hàng', type: 3, required: true }],
  },
  {
    name: 'sales',
    description: 'Tổng doanh số',
    options: [
      {
        name: 'period',
        description: 'Khoảng thời gian',
        type: 3,
        required: false,
        choices: [
          { name: 'Hôm nay', value: 'today' },
          { name: '7 ngày qua', value: 'week' },
        ],
      },
    ],
  },
];

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const discord = await getDiscordConfig(payload);
  if (!discord.botToken || !discord.applicationId || !discord.guildId) {
    throw new Error('Missing botToken / applicationId / guildId in Notification settings.');
  }

  const url = `https://discord.com/api/v10/applications/${discord.applicationId}/guilds/${discord.guildId}/commands`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${discord.botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(COMMANDS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Register failed: ${res.status} ${detail}`);
  }
  // eslint-disable-next-line no-console
  console.log(`Registered ${COMMANDS.length} guild commands.`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
