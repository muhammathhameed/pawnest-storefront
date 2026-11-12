# AuraFinds Liquid Glass Design System

Single source: `app/globals.css`. Pages must use these tokens and primitives only.

**Tokens** (light + dark via `prefers-color-scheme`): `--bg --surface --card --border --text --muted --primary --primary-2 --electric --success --warning --danger`. Tailwind aliases: `bg-card bg-surface text-ink text-muted border-line text-brand text-success`.
**Spacing** `--s-1..9` = 4 8 12 16 24 32 48 64 96 px. **Radius** `--r-sm/md/lg/xl/full`. **Elevation** `--shadow-sm/md/lg`.
**Type scale**: `.t-hero .t-page .t-section .t-card .t-body .t-caption .t-label .t-button`.
**Glass primitives**: `.glass .glass-card .glass-strong .glass-nav .glass-menu .glass-sidebar .glass-input .glass-search .glass-modal-backdrop`.
**Buttons**: `.btn .btn-primary .btn-glass .btn-danger .btn-sm .btn-icon`. **Parts**: `.badge(-success|-warning|-danger|-primary) .alert(-success|-danger) .skeleton`.
**Motion**: `.fade-in .slide-up`, menu/drawer animations; all disabled by `prefers-reduced-motion`.
Legacy class names used by cart/checkout/product/category/auth pages (`.cart-*`, `.checkout-*`, `.product-*`, `.primary-button`, ...) are defined at the end of the stylesheet from the same tokens.
The marketing homepage body is wrapped in `data-theme="light"` and still contains legacy Tailwind palette classes; migrate its sections to the primitives incrementally.
