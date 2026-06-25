---
name: Assort1 Core System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#006242'
  on-tertiary: '#ffffff'
  tertiary-container: '#007d55'
  on-tertiary-container: '#bdffdb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  sidebar_width: 260px
---

## Brand & Style

The design system is engineered for a high-efficiency B2B SaaS environment, specifically tailored for Indian SMBs. The brand personality is **Professional, Calm, and Precise**, prioritizing clarity and data density without overwhelming the user.

The aesthetic follows a **Corporate / Modern** style, utilizing a systematic approach to white space and layout to ensure complex workflows remain approachable. The emotional goal is to evoke a sense of reliability and institutional stability, using a clean "Utility-First" visual language that stays out of the way of the user's tasks.

## Colors

The palette is anchored by **Slate Blue (#2563EB)**, a color chosen for its association with trust and professional technology. 

- **Primary & Action:** Slate Blue is used for primary actions, focus states, and active navigation indicators.
- **Surface Strategy:** We utilize a tiered neutral system. The main background is pure white (#FFFFFF), while secondary surfaces like sidebars and container backgrounds use a subtle Grey (#F8FAFC) to create structural distinction.
- **Semantic Clarity:** Success, Warning, and Danger colors follow standard industry conventions to ensure immediate cognitive recognition during workflow management.
- **Typography Contrast:** Primary text uses a near-black (#0F172A) for maximum legibility, while secondary metadata uses a muted grey (#64748B).

## Typography

This design system utilizes **Inter** exclusively to maintain a highly systematic and utilitarian feel. The type scale is optimized for data-heavy SaaS applications.

- **Scale:** The base font size for most administrative tasks and tables is **14px (body-md)**, providing a balance between legibility and information density. 
- **Hierarchy:** We use Semi-Bold (600) and Bold (700) weights for headings to create a clear visual anchor on the page.
- **Labels:** Small labels (label-sm) are used for badges and table headers, often paired with slightly increased letter spacing and uppercase styling for better scannability at small sizes.

## Layout & Spacing

The layout uses a **Fluid Grid** model with fixed sidebar navigation. The system is built on a 4px baseline shift to ensure all elements align to a consistent rhythmic scale.

- **Sidebar:** A fixed 260px left navigation provides persistent access to primary modules.
- **Content Area:** Content is housed within flexible containers with a standard 24px (lg) padding.
- **Breakpoints:** 
    - **Desktop:** 12-column grid, 24px margins.
    - **Tablet:** 8-column grid, 16px margins.
    - **Mobile:** 4-column grid, 16px margins.
- **Density:** In data-heavy views (like tables), vertical spacing can be reduced to 8px (sm) to maximize information visibility on a single screen.

## Elevation & Depth

This design system relies on **Tonal Layers** and **Low-contrast Outlines** rather than aggressive shadows. This keeps the interface feeling "flat" and modern while still indicating hierarchy.

- **Level 0 (Flat):** The main background surface.
- **Level 1 (Card):** Used for primary content containers. Defined by a 1px border (#E2E8F0) and a very soft, subtle shadow (0px 1px 3px rgba(15, 23, 42, 0.08)).
- **Level 2 (Overlay):** Used for dropdowns and popovers. These feature a more pronounced shadow to separate them from the main UI (0px 10px 15px -3px rgba(15, 23, 42, 0.1)).
- **Interactive Depth:** Buttons and interactive cards should not shift in elevation on hover; instead, they utilize subtle background color shifts to indicate interactivity.

## Shapes

The shape language is consistent with a **Rounded** philosophy (8px/0.5rem base) to soften the professional aesthetic and make it feel more modern and approachable.

- **Standard Containers:** Cards, modals, and input fields use an 8px radius.
- **Interactive Elements:** Buttons utilize a slightly softer `rounded-md` feel (6px).
- **Status Indicators:** Badges and Pills use a `rounded-full` (999px) radius to distinguish them from functional UI components.

## Components

### Buttons
- **Primary:** Solid #2563EB background with White text. High contrast for the "Main" action.
- **Secondary:** White background with #E2E8F0 border and #2563EB text. Used for supporting actions.
- **Danger:** Solid #EF4444 background with White text. Reserved for destructive actions.

### Input Fields
- **Default State:** White background, 1px #E2E8F0 border, 8px radius.
- **Focus State:** 1px #2563EB border with a 3px soft outer ring (25% opacity of primary color).

### Badges / Status Pills
- **Visual Style:** 10% opacity of the semantic color for the background (e.g., light green for Success) with 100% opacity text of the same color. 
- **Shape:** Always `rounded-full`.

### Sidebar Navigation
- **Surface:** #F8FAFC.
- **Active State:** When a menu item is active, it receives a #EFF6FF background and a 4px solid #2563EB left-border accent to clearly guide the user's location.

### Cards
- **Base:** White background, #E2E8F0 border, 8px radius. Subtle shadow for elevation Level 1.