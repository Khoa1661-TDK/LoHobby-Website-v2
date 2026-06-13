// lib/discord/client.ts — Discord bot config + channel message send
import type { Payload } from 'payload';
import type { DiscordEmbed, DiscordActionRow } from '@/lib/discord/order-notification';

const API_BASE = 'https://discord.com/api/v10';

export interface DiscordConfig {
  enabled: boolean;
  botToken: string;
  channelId: string;
  publicKey: string;
  allowedUserIds: string[];
}

interface NotificationGlobalShape {
  discordEnabled?: boolean | null;
  discordBotToken?: string | null;
  discordChannelId?: string | null;
  discordPublicKey?: string | null;
  discordAllowedUserIds?: string | null;
}

function parseIds(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getDiscordConfig(payload: Payload): Promise<DiscordConfig> {
  const g = (await payload.findGlobal({
    slug: 'notification-settings',
  })) as NotificationGlobalShape;
  return {
    enabled: Boolean(g.discordEnabled),
    botToken: g.discordBotToken ?? '',
    channelId: g.discordChannelId ?? '',
    publicKey: g.discordPublicKey ?? '',
    allowedUserIds: parseIds(g.discordAllowedUserIds),
  };
}

export function isDiscordConfigComplete(config: DiscordConfig): boolean {
  return Boolean(config.botToken && config.channelId && config.publicKey);
}

export interface ChannelMessagePayload {
  embeds: DiscordEmbed[];
  components: DiscordActionRow[];
}

export async function sendChannelMessage(
  config: DiscordConfig,
  message: ChannelMessagePayload,
): Promise<void> {
  const res = await fetch(`${API_BASE}/channels/${config.channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${config.botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`[discord] send failed: ${res.status} ${detail}`);
  }
}
