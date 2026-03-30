# PageBackground — Per-Page Animation System
# Usage Guide for Prime

## File Placement

```
COPY: PageBackground.tsx → src/components/scenes/PageBackground.tsx
```

## How to Use

Import and add to any page:

```tsx
import PageBackground from "@/components/scenes/PageBackground";

export default function GalleryPage() {
  return (
    <div className="relative min-h-screen">
      <PageBackground variant="gallery" />
      {/* rest of page content */}
    </div>
  );
}
```

## Available Variants

| Variant    | Page     | Visual Description                                    |
|-----------|----------|------------------------------------------------------|
| homepage  | /        | 2000 particles forming sacred geometry patterns       |
| gallery   | /gallery | Tron-style perspective grid with pulsing lines        |
| codex     | /codex   | Counter-rotating star tetrahedron (gold + cyan)       |
| sanctum   | /sanctum | Toroidal particle flow (gold + purple)                |
| journal   | /journal | Akashic data streams — luminous vertical columns      |
| connect   | /connect | Pulsing trinary symbol with sonar wave emissions      |
| about     | /about   | Vitruvian geometry — circle, square, golden spiral     |
| research  | /research| Cymatics — morphing circular waveform patterns        |
| oracle    | /oracle  | Stars + nebula clouds (already built into oracle page) |

## All Scenes Include

Every variant automatically has:
- Zalgo glyph rain (1-2% opacity, magenta tint)
- CRT scan lines
- Moving scan line
- Matching background color (#0a090e via transparent canvas)

## Adding to Root Layout (Global Background)

Instead of adding to each page individually, you can add it to the
root layout with a default variant, then override per page:

```tsx
// src/app/layout.tsx
import PageBackground from "@/components/scenes/PageBackground";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PageBackground variant="homepage" />
        <Navigation />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

Then on specific pages, add the page-specific variant which will
render on top (both canvases are fixed position, pointer-events none):

```tsx
// src/app/gallery/page.tsx
import PageBackground from "@/components/scenes/PageBackground";

export default function GalleryPage() {
  return (
    <>
      <PageBackground variant="gallery" />
      {/* page content */}
    </>
  );
}
```

## Page-Variant Mapping (Quick Reference)

```
/              → homepage
/gallery       → gallery
/gallery/[slug]→ gallery
/codex         → codex
/sanctum       → sanctum
/sanctum/[slug]→ sanctum
/journal       → journal
/journal/[slug]→ journal
/connect       → connect
/about         → about
/research      → research
/research/*    → research
/oracle        → oracle (already has its own — skip if keeping inline)
```

## Technical Notes

- Canvas uses requestAnimationFrame (60fps)
- All rendering is 2D Canvas (no Three.js dependency)
- DevicePixelRatio-aware (sharp on retina)
- Pointer-events: none (never blocks clicks or scroll)
- Reinitializes particles on window resize
- Each variant is ~50-100 lines of draw code, all in one file
- Zero external dependencies — pure Canvas API
