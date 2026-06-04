'use client';

import Script from 'next/script';
import { useEffect, type ReactElement } from 'react';
import type { ChatConfig } from '@/lib/store-settings';

// Facebook's Chat Plugin reads these as raw DOM attributes on the div; allow them in TSX.
declare module 'react' {
  interface HTMLAttributes<T> {
    page_id?: string;
    attribution?: string;
    greeting_dialog_display?: string;
    theme_color?: string;
    logged_in_greeting?: string;
    logged_out_greeting?: string;
  }
}

const FB_SDK_SRC = 'https://connect.facebook.net/vi_VN/sdk/xfbml.customerchat.js';
const FB_SDK_VERSION = 'v21.0';
const ZALO_SDK_SRC = 'https://sp.zalo.me/plugins/sdk.js';

export default function LiveChatWidget({ config }: { config: ChatConfig }): ReactElement | null {
  const { messenger } = config;

  // The Facebook SDK calls window.fbAsyncInit on load; define it before the
  // (lazyOnload) SDK script fires. useEffect runs on mount, well before that.
  useEffect(() => {
    if (!messenger) return;
    (window as unknown as { fbAsyncInit?: () => void }).fbAsyncInit = () => {
      const FB = (window as unknown as { FB?: { init: (o: Record<string, unknown>) => void } }).FB;
      FB?.init({ xfbml: true, version: FB_SDK_VERSION });
    };
  }, [messenger]);

  if (!config.enabled || (!config.zalo && !config.messenger)) {
    return null;
  }

  return (
    <>
      {config.messenger ? (
        <>
          <div id="fb-root" />
          <div
            className="fb-customerchat"
            page_id={config.messenger.pageId}
            attribution="biz_inbox"
            greeting_dialog_display="hide"
            {...(config.messenger.themeColor ? { theme_color: config.messenger.themeColor } : {})}
            {...(config.messenger.greeting
              ? {
                  logged_in_greeting: config.messenger.greeting,
                  logged_out_greeting: config.messenger.greeting,
                }
              : {})}
          />
          <Script id="fb-customerchat-sdk" src={FB_SDK_SRC} strategy="lazyOnload" />
        </>
      ) : null}

      {config.zalo ? (
        <>
          <div
            className="zalo-chat-widget"
            data-oaid={config.zalo.oaId}
            data-welcome-message={config.zalo.welcomeMessage || undefined}
            data-autopopup="0"
          />
          <Script id="zalo-chat-sdk" src={ZALO_SDK_SRC} strategy="lazyOnload" />
        </>
      ) : null}
    </>
  );
}
