# i18n Phase 3 — Remaining Surfaces & Polish

## Goal
Translate the remaining storefront surfaces (About, Contact, FAQ, Blog, Search, Home)
into the `next-intl` message system, covering both VI and EN, then verify build output.

## Namespace Plan

| Namespace | Surfaces |
|-----------|----------|
| `info`    | About page, Contact page + form, FAQ page |
| `blog`    | Blog index, post detail page, category listing, PostCard component |
| `search`  | Search page, category/collection page, empty state |
| `home`    | Hero section, category section + header, personalized recommendations |
| `common`  | Extended: pagination labels, breadcrumbs empty label |

## Component → Key Mapping

### `info` (~40 keys)
- About: page title, meta desc, eyebrow, heading template, story paragraphs (2), value cards (4 titles + 4 bodies), CTA buttons (2)
- Contact: page title, meta desc, form labels (name, email, order code, message), placeholder, submit button, sending state, success message, "send another" button, sidebar headings (email, hotline, address)
- FAQ: page title, meta desc, 7 Q&A pairs (14 keys), "Xem thêm" heading, related links (6 labels)

### `blog` (~15 keys)
- Index: title, meta desc, "Tất cả" filter label, "Chưa có bài viết" empty state
- Post card: reading time, categories label
- Category page: breadcrumb base labels

### `search` (~15 keys)
- Meta title/desc templates (with query interpolation)
- Results count template ("Hiển thị N kết quả cho"), product count ("N sản phẩm")
- No results, no products in category, filter empty states
- Category-specific: "Sản phẩm {title} nổi bật", "Câu hỏi thường gặp về {title}"

### `home` (~15 keys)
- Hero: carousel subtitle ("Mới nhất từ bộ sưu tập"), "Xem tất cả" (×2), empty carousel state ("Sản phẩm mới sẽ xuất hiện tại đây", "Khám phá cửa hàng"), categories nav label, "Tất cả" pill
- Category section: "Xem thêm {count} sản phẩm" link
- Recommendations: heading, subtitle

### `common` — extended (~5 keys)
- Pagination: aria-label, previous/next labels
- Breadcrumbs: home label, fallback

## Execution Order

1. Extend `messages/en.json` and `messages/vi.json` with all keys
2. Wire each component (about → contact → faq → blog → search → home → pagination)
3. Verify `<html lang>` and OG locale
4. Build + smoke test

## Decisions
- FAQ content lives in message catalog (not separate data files) for simplicity
- "Xem tất cả" gets a key in each namespace it appears in (avoids cross-namespace coupling)
- About prose paragraphs go in messages verbatim
- Dynamic CMS content (hero.title, branding strings) is NOT moved — only static chrome