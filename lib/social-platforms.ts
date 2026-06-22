// lib/social-platforms.ts — canonical social platform list, shared by the Payload block
// schema (select options) and the SocialIcon component (label + icon lookup). Kept JSX-free
// so it can be imported into the Payload config without pulling React into that bundle.

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'youtube'
  | 'tiktok'
  | 'discord'
  | 'linkedin'
  | 'threads'
  | 'pinterest'
  | 'telegram'
  | 'whatsapp'
  | 'github'
  | 'email';

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'discord', label: 'Discord' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'threads', label: 'Threads' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'github', label: 'GitHub' },
  { value: 'email', label: 'Email' },
];

export function socialPlatformLabel(platform: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.value === platform)?.label ?? platform;
}
