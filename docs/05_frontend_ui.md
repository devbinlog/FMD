# 05 — Frontend UI Spec (MVP)

> Status: **FINAL** — populated from Figma design spec (2026-02-15)

---

## 1. Design Tokens

### 1.1 Colors

| Token              | Tailwind        | Hex       | Usage                          |
|--------------------|-----------------|-----------|--------------------------------|
| `--color-primary`  | `blue-600`      | `#2563eb` | CTA buttons, links, price      |
| `--color-secondary`| `purple-600`    | `#9333ea` | Accent, gradient end           |
| `--color-bg`       | gradient        | `from-blue-50 via-white to-purple-50` | Page background |
| `--color-surface`  | `white`         | `#ffffff` | Card / panel bg                |
| `--color-text`     | `gray-900`      | `#111827` | Body text                      |
| `--color-text-sub` | `gray-600`      | `#4b5563` | Secondary / muted text         |
| `--color-border`   | `gray-300`      | `#d1d5db` | Dividers, card borders         |
| `--color-success`  | `yellow-400`    | `#facc15` | Star ratings                   |

### 1.2 Typography

| Token          | Tailwind Class          | Size   | Weight | Usage          |
|----------------|-------------------------|--------|--------|----------------|
| `--font-h1`    | `text-3xl font-bold`    | 30px   | 700    | Page title     |
| `--font-h2`    | `text-2xl font-semibold`| 24px   | 600    | Section title  |
| `--font-h3`    | `text-xl font-semibold` | 20px   | 600    | Card title     |
| `--font-body`  | `text-base font-normal` | 16px   | 400    | Body text      |
| `--font-small` | `text-sm`               | 14px   | 400    | Labels, seller |
| `--font-xs`    | `text-xs`               | 12px   | 400    | Captions, tags |

### 1.3 Spacing

| Context              | Tailwind     | Value |
|----------------------|-------------|-------|
| Section gap          | `space-y-8` | 32px  |
| Card grid gap        | `gap-6`     | 24px  |
| Component internal   | `space-y-6` | 24px  |
| Container padding    | `px-4`      | 16px  |
| Main vertical pad    | `py-8`      | 32px  |

### 1.4 Radius & Shadow

| Token              | Value                              |
|--------------------|------------------------------------|
| `--radius-card`    | Tailwind default `rounded-lg` (8px)|
| `--shadow-card`    | `shadow-sm` (default)              |
| `--shadow-card-hover` | `shadow-lg` (on hover)          |
| `--shadow-header`  | `shadow-sm`                        |

---

## 2. Layout

### 2.1 Grid

- Max content width: `max-w-7xl` (1280px)
- Center: `mx-auto`
- Side padding: `px-4` (16px)
- Result grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Grid gap: `gap-6`

### 2.2 Breakpoints

| Name      | Min Width | Columns |
|-----------|-----------|---------|
| `mobile`  | 0px       | 1       |
| `md`      | 768px     | 2       |
| `lg`      | 1024px    | 3       |

### 2.3 Page Shell

```
┌──────────────────────────────────────┐
│  Header                              │  bg-white, shadow-sm, border-b
│  (Sparkles icon + "FMD" + subtitle)  │  sticky top-0
├──────────────────────────────────────┤
│                                      │
│  Main Content                        │  max-w-7xl mx-auto px-4 py-8
│  ┌──────────────────────────────┐    │
│  │  Input Section (white card)  │    │
│  │  - Tabs (Text / Sketch)     │    │
│  │  - Input area               │    │
│  │  - Category selector        │    │
│  │  - Search button            │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Results Section             │    │
│  │  - Header (title + count)   │    │
│  │  - Product Grid (3 cols)    │    │
│  └──────────────────────────────┘    │
│                                      │
├──────────────────────────────────────┤
│  Footer                              │  bg-white, border-t, mt-16
│  (copyright + info)                  │
└──────────────────────────────────────┘
```

---

## 3. Page: `/` — Single Page App

> MVP is a single-page application. All interaction happens on `/`.

### 3.1 States

| State     | What's visible                                |
|-----------|-----------------------------------------------|
| `idle`    | Input Section + Empty State                   |
| `loading` | Input Section (disabled) + Loading spinner    |
| `results` | Input Section + Results Section (product grid)|
| `error`   | Input Section + Error banner with retry       |

---

## 4. Component Tree

```
App
├── Header
│   ├── Logo (Sparkles icon + "FMD" text)
│   └── Subtitle text
├── Main
│   ├── InputSection (white card, rounded, shadow)
│   │   ├── Title + Description
│   │   ├── InputModeTabs ["Text", "Sketch"]
│   │   ├── TextPromptPanel (textarea, visible when tab=text)
│   │   ├── CanvasPanel (DrawingCanvas, visible when tab=sketch)
│   │   │   └── Tools: draw/erase toggle, size slider
│   │   ├── CategorySelector (4 category buttons)
│   │   └── SubmitButton (full-width, blue-600)
│   ├── ResultsSection (visible when results exist)
│   │   ├── ResultsHeader (title + count badge)
│   │   └── ProductGrid (responsive 1/2/3 cols)
│   │       └── ProductCard (×N)
│   │           ├── Image (aspect-square)
│   │           ├── SimilarityBadge (top-right overlay)
│   │           ├── Name (font-semibold)
│   │           ├── Price (text-2xl, blue-600, font-bold)
│   │           ├── Seller (text-sm, gray-500)
│   │           ├── Reason text
│   │           ├── Tags (Badge components)
│   │           └── ViewButton (outline, full-width)
│   └── EmptyState (visible when no results + idle)
│       ├── Icon
│       ├── Title
│       └── Description
└── Footer
    ├── Copyright
    └── Info text
```

---

## 5. Component Rules

### 5.1 Header

```
bg-white shadow-sm border-b
├── container: max-w-7xl mx-auto px-4 py-4
├── logo: Sparkles icon (text-blue-600) + "FMD" (text-2xl font-bold)
└── subtitle: text-sm text-gray-500
```

### 5.2 InputModeTabs

- 2 tabs: "Text" / "Sketch"
- Active: `variant="default"` (filled)
- Inactive: `variant="outline"`
- Switches visible panel below

### 5.3 TextPromptPanel

- `<Textarea>` with placeholder
- Min height: ~120px
- Border: gray-300, focus: blue-600 ring

### 5.4 CanvasPanel (DrawingCanvas)

- HTML5 Canvas element
- Toolbar: draw/erase toggle button + brush size slider
- Border: 1px gray-300, rounded
- Aspect ratio: landscape (~16:9 or flexible)

### 5.5 CategorySelector

- 4 category buttons in a row (flex, wrap on mobile)
- Selected: `variant="default"` (filled blue)
- Unselected: `variant="outline"`
- Categories: TBD (e.g., "UI", "Logo", "Icon", "Illustration")

### 5.6 SubmitButton

```
w-full bg-blue-600 hover:bg-blue-700 text-white
h-11 (44px touch target)
rounded-md
disabled: opacity-50 cursor-not-allowed
loading: spinner icon + "Searching..." text
```

### 5.7 ProductCard

```
bg-white rounded-lg border shadow-sm
hover:shadow-lg transition-shadow

├── Image area: aspect-square, object-cover, rounded-t-lg
│   └── SimilarityBadge: absolute top-2 right-2
│       bg-blue-600 text-white text-xs px-2 py-1 rounded
├── Content area: p-4 space-y-2
│   ├── Name: text-lg font-semibold truncate
│   ├── Price: text-2xl font-bold text-blue-600
│   ├── Seller: text-sm text-gray-500
│   ├── Reason: text-sm text-gray-600
│   ├── Tags: flex flex-wrap gap-1
│   │   └── Badge: text-xs variant="secondary"
│   └── ViewButton: w-full variant="outline" mt-2
```

### 5.8 EmptyState

```
text-center py-16
├── Icon: w-16 h-16 mx-auto text-gray-300
├── Title: text-xl font-semibold text-gray-600 mt-4
└── Description: text-gray-400 mt-2
```

---

## 6. Interactions

| Trigger               | Action                                      |
|-----------------------|---------------------------------------------|
| Tab click (Text)      | Show TextPromptPanel, hide CanvasPanel      |
| Tab click (Sketch)    | Show CanvasPanel, hide TextPromptPanel      |
| Category click        | Toggle selected state (single-select)       |
| Search click          | Disable form, show spinner, call API        |
| Search success        | Render ProductGrid with results             |
| Search error          | Show error toast/banner + retry button      |
| Product card hover    | `shadow-sm` → `shadow-lg` transition        |
| View button click     | Open source link (external, `_blank`)       |
| Canvas draw           | Freehand drawing on canvas                  |
| Canvas erase          | Erase mode toggle                           |
| Brush size slider     | Adjust draw/erase radius                    |

---

## 7. Conventions

- Framework: **Next.js App Router** (already set up)
- Styling: **Tailwind CSS v4**
- Components: **Shadcn UI** (Button, Badge, Textarea, Tabs, Card, Slider)
- Icons: **Lucide React** (Sparkles, Search, Paintbrush, Eraser, etc.)
- Language: **TypeScript** strict
- Mobile-first responsive
- All interactive elements must have visible label or `aria-label`
- Images: use `next/image` with explicit width/height
- State management: React `useState` / `useReducer` (no external lib for MVP)
