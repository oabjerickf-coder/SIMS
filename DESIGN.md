---
name: Aura Academic Glass
colors:
  surface: '#10131c'
  surface-dim: '#10131c'
  surface-bright: '#363943'
  surface-container-lowest: '#0b0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#272a33'
  surface-container-highest: '#32343e'
  on-surface: '#e0e2ef'
  on-surface-variant: '#d3c4b5'
  inverse-surface: '#e0e2ef'
  inverse-on-surface: '#2d303a'
  outline: '#9b8f81'
  outline-variant: '#4f453a'
  surface-tint: '#edbf81'
  primary: '#edbf81'
  on-primary: '#452b00'
  primary-container: '#c89d63'
  on-primary-container: '#523403'
  inverse-primary: '#7b5825'
  secondary: '#c0c6dd'
  on-secondary: '#2a3042'
  secondary-container: '#404659'
  on-secondary-container: '#afb4cb'
  tertiary: '#aac9f0'
  on-tertiary: '#0e3251'
  tertiary-container: '#88a7cc'
  on-tertiary-container: '#1b3c5c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb4'
  primary-fixed-dim: '#edbf81'
  on-primary-fixed: '#291800'
  on-primary-fixed-variant: '#60400f'
  secondary-fixed: '#dce2f9'
  secondary-fixed-dim: '#c0c6dd'
  on-secondary-fixed: '#151b2c'
  on-secondary-fixed-variant: '#404659'
  tertiary-fixed: '#d0e4ff'
  tertiary-fixed-dim: '#aac9f0'
  on-tertiary-fixed: '#001d35'
  on-tertiary-fixed-variant: '#294969'
  background: '#10131c'
  on-background: '#e0e2ef'
  surface-variant: '#32343e'
  gold-light: '#E0B77D'
  gold-dim: '#9B7843'
  surface-translucent: rgba(27, 33, 50, 0.65)
  surface-glass-border: rgba(200, 157, 99, 0.18)
  glass-specular-edge: rgba(255, 255, 255, 0.08)
  text-primary: '#F7FAFC'
  text-muted: '#9099A9'
  glow-ambient-blue: '#16203B'
  glow-ambient-gold: rgba(200, 157, 99, 0.12)
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-xl-mobile:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-lg:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
  headline-sm:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system expresses academic prestige merged with cutting-edge digital craftsmanship. Designed for student information portals, authentication flows, and institutional gateways, it balances scholarly authority with a futuristic, luminous dark mode experience.

The visual direction leans deeply into refined **Glassmorphism** supported by ambient lighting and precision borders. Rather than flat corporate sterility or overwhelming hyper-neon effects, the experience is anchored in deep cosmic slate and midnight navy foundations, layered with translucent acrylic surfaces, subtle inner refraction lines, and radiant antique gold illumination. It instills an immediate sense of trust, focus, security, and institutional excellence for students, educators, and administrators alike.

## Colors

The palette is tuned specifically for deep-contrast, low-eye-strain dark environments:
- **Primary (`#C89D63`)**: A distinguished, warm antique gold that delivers high-tier institutional presence. Used for primary CTAs, active indicator rings, brand insignia, and key focal interactions.
- **Secondary (`#1B2132`)**: A tempered midnight slate that drives elevated card bodies, inset inputs, and modal backgrounds.
- **Neutral (`#12151E`)**: The ultra-deep obsidian navy foundation of the entire interface, allowing glowing backdrops and frosted surfaces to pop with optical depth.
- **Translucent Overlays & Accent Rims**: Refined alpha tokens such as `surface-translucent` and `surface-glass-border` allow physical light refraction, pairing subtle golden rim lighting with ethereal glass surfaces.

## Typography

The typographic hierarchy pairs an authoritative editorial serif for titles with a clean, highly legible neo-grotesque sans-serif for UI labels and data entry:
- **Display & Headlines (`Newsreader`)**: Evokes the timeless dignity of classical academic publishing, diplomas, and collegiate crests. Generously tracked titles give an aura of prestige.
- **Functional Body & Labels (`Inter`)**: Delivers maximum legibility and technical rigor across form inputs, microcopy, status tags, and system feedback.
- Large headers smoothly contract on mobile breakpoints to eliminate accidental line wrapping in compact modal sheets.

## Layout & Spacing

Layouts adhere to an 8px spatial grid designed around floating, centered container architectures for authentication portals, scaling out to fluid multi-column dashboards upon authentication.

- **Canvas Arrangement**: Dedicated entry portals employ a centered floating glass viewport (maximum width of 440px on desktop) enveloped by expansive negative space that showcases subtle radial illumination.
- **Rhythm & Padding**: Inside card containers, vertical rhythm progresses with `space-lg` (24px) separating distinct interactive clusters and `space-sm` (8px) binding labels directly to input fields.
- **Adaptive Breakpoints**:
  - *Mobile (<640px)*: Containers stretch fluidly with `margin-mobile` padding from the viewport edges. Backdrop filters remain high-performance, and button touch targets expand to 48px minimal height.
  - *Tablet & Desktop (>=640px)*: Cards sit fixed at standard optical dimensions with subtle elevation floats and ambient lighting blooming behind the card geometry.

## Elevation & Depth

Visual hierarchy is constructed entirely through optical glass physics, multi-stop backdrop blurring, and luminous ambient diffusion:

1. **Ambient Void (Level 0)**: Base color `#12151E` layered with two soft radial gradient light meshes—a cool navy bloom (`#16203B` blur radius 140px) at the top right and a gentle gold shimmer (`rgba(200, 157, 99, 0.08)` blur radius 180px) anchored off-center.
2. **Frosted Surface Containers (Level 1)**: Elevated cards utilize `backdrop-filter: blur(24px) saturate(140%)` over semi-transparent slate `rgba(27, 33, 50, 0.65)`. They feature a dual-edge treatment: a crisp 1px perimeter border of `rgba(255, 255, 255, 0.08)` combined with a subtle top-lit directional specular highlight of `rgba(200, 157, 99, 0.25)`.
3. **Floating Interactive Elements (Level 2)**: Action buttons and active dropdowns cast diffused amber drop shadows (`box-shadow: 0 12px 32px -4px rgba(200, 157, 99, 0.35)`), generating physical lift against the glass surface.
4. **Inset Depth**: Form inputs and nested informational panels use inverted light behavior: a darker, translucent well (`rgba(14, 18, 28, 0.6)`) with a faint 1px inner border, creating an engraved, tactile feel.

## Shapes

The design system maintains a balanced **Rounded (Level 2)** aesthetic that bridges architectural discipline with contemporary software fluidity:
- **Major Containers**: Auth modules and modal dialogs use `1.25rem` to `1.5rem` (`rounded-xl`), creating soft structural silhouettes against the ambient backdrop.
- **Form Controls & Inputs**: Form fields and primary action buttons utilize `0.5rem` to `0.625rem` (`rounded-md` to `rounded-lg`) for clean, pocketed click targets.
- **Brand Badges & Seals**: Institutional avatars and crest badges use unified squircle or soft circular geometries framed in metallic gold rings.

## Components

### Buttons
- **Primary**: Solid rich gold (`#C89D63`) fill with deep dark text (`#12151E`, font weight 600). On hover, transitions seamlessly to `#E0B77D` with a warm halo glow (`0 0 20px rgba(200, 157, 99, 0.4)`).
- **Secondary / Ghost**: Transparent fill, 1px frosted glass border (`rgba(255, 255, 255, 0.12)`), text color `#F7FAFC`. On hover, surface becomes `rgba(255, 255, 255, 0.05)` with gold accent typography.

### Input Fields
- **Container**: Dark recessed slate fill (`rgba(18, 22, 34, 0.75)`), 1px subtle boundary (`rgba(255, 255, 255, 0.08)`), height 48px, horizontal padding `1rem`.
- **Text & Placeholders**: Input text in crisp white (`#F7FAFC`), placeholder text in muted silver (`#5A6478`).
- **Focus State**: 1px crisp gold border (`#C89D63`) supplemented by an outer ambient glow ring (`0 0 0 3px rgba(200, 157, 99, 0.15)`).

### Cards & Dialogs
- Centered frosted glass containers with layered border speculars (1px top-to-bottom gradient border transitioning from `rgba(200, 157, 99, 0.3)` to `rgba(255, 255, 255, 0.04)`).
- Subtle inner shadow `inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)` to produce an authentic beveled optical glass lip.

### Status Banners & Informational Panels
- Inset card containers with low-opacity slate backgrounds (`rgba(27, 33, 50, 0.45)`), 1px hairline borders, and muted supporting typography for routing instructions, multi-role alerts, and password guidance.

### Checkboxes & Radios
- Frosted dark slate boxes with hairline gold borders on active selection. Checked state renders a solid gold glyph checkmark centered within the unit.