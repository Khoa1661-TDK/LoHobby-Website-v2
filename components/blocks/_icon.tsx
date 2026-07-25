// components/blocks/_icon.tsx — name -> lucide component map for page-builder blocks.
// The map is STATIC on purpose: a dynamic lookup would defeat tree-shaking and hide the
// references from Tailwind's class scanner. Adding a name to lib/page-builder/icons.ts
// means adding its import here; the block-icon test enforces that.
import type { LucideProps } from 'lucide-react';
import {
  ArrowRight, ArrowUpRight, Award, BadgeCheck, Bell, BookOpen, Box, Brush,
  Calendar, ChartColumn, Check, CircleCheck, CircleHelp, Clock, CreditCard, Download,
  FileText, Flame, Gift, Globe, Hammer, Handshake, Headphones, Heart, Image as ImageIcon,
  Layers, Leaf, LifeBuoy, Lock, Mail, MapPin, MessageCircle, Package, Palette, Percent,
  Phone, Play, Printer, Receipt, Recycle, RefreshCw, Ruler, Scissors, Search, Settings,
  Shield, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Star, Store, Tag, ThumbsUp,
  TrendingUp, Truck, User, Users, Video, Wallet, Wand, Wrench, Zap,
} from 'lucide-react';
import type { ComponentType, ReactElement } from 'react';
import type { BlockIconName } from '@/lib/page-builder/icons';
import { LEGACY_ICON_ALIASES } from '@/lib/page-builder/icons';

// Typed against the literal union, NOT Record<string, …>: this is what makes the compiler
// reject a missing or misspelled key, so a name added to icons.ts without an import here
// is a build error rather than a silently absent icon at runtime.
export const ICON_COMPONENTS: Record<BlockIconName, ComponentType<LucideProps>> = {
  'truck': Truck, 'package': Package, 'box': Box, 'tag': Tag,
  'shopping-cart': ShoppingCart, 'shopping-bag': ShoppingBag, 'credit-card': CreditCard,
  'receipt': Receipt, 'gift': Gift, 'percent': Percent, 'store': Store, 'wallet': Wallet,

  'shield': Shield, 'shield-check': ShieldCheck, 'award': Award, 'badge-check': BadgeCheck,
  'lock': Lock, 'thumbs-up': ThumbsUp, 'star': Star, 'heart': Heart,
  'headphones': Headphones, 'life-buoy': LifeBuoy, 'handshake': Handshake,

  'printer': Printer, 'ruler': Ruler, 'layers': Layers, 'wrench': Wrench,
  'palette': Palette, 'scissors': Scissors, 'hammer': Hammer, 'recycle': Recycle,
  'leaf': Leaf, 'sparkles': Sparkles, 'wand': Wand, 'brush': Brush,

  'arrow-right': ArrowRight, 'arrow-up-right': ArrowUpRight, 'check': Check,
  'circle-check': CircleCheck, 'circle-help': CircleHelp, 'clock': Clock,
  'calendar': Calendar, 'mail': Mail, 'phone': Phone, 'map-pin': MapPin,
  'globe': Globe, 'search': Search, 'zap': Zap, 'flame': Flame,
  'trending-up': TrendingUp, 'chart-column': ChartColumn, 'users': Users, 'user': User,
  'message-circle': MessageCircle, 'bell': Bell, 'settings': Settings,
  'refresh-cw': RefreshCw, 'download': Download, 'play': Play,
  'image': ImageIcon, 'video': Video, 'file-text': FileText, 'book-open': BookOpen,
};

/**
 * Resolve a stored icon name (current or legacy) to its component, or null when the
 * name is absent or unresolvable. The single place alias-resolution + lookup happens —
 * both `BlockIcon` and any caller that needs to know "would this render anything?"
 * (e.g. FeatureGrid deciding whether to render its icon-slot wrapper) go through this.
 */
export function resolveIcon(name?: string | null): ComponentType<LucideProps> | null {
  if (!name) return null;
  const resolved = LEGACY_ICON_ALIASES[name] ?? name;
  // `resolved` is untrusted input (a stored field value), so widen for the lookup only —
  // the map itself stays exhaustively typed above.
  return (ICON_COMPONENTS as Record<string, ComponentType<LucideProps> | undefined>)[resolved] ?? null;
}

type Props = {
  name?: string | null;
  className?: string;
  size?: number;
};

/** Render a registry icon by name. Unknown or absent names render nothing. */
export default function BlockIcon({ name, className, size = 24 }: Props): ReactElement | null {
  const Icon = resolveIcon(name);
  if (!Icon) return null;
  return <Icon className={className} size={size} aria-hidden />;
}
