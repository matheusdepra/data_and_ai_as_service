# 97-design-tokens.md

# Dativerso Design Tokens

Version: 1.0

Status: Foundation

---

# Purpose

This document defines the visual language of Dativerso.

All screens, components and future features must follow these tokens.

These tokens are the single source of truth for:

* Colors
* Typography
* Spacing
* Radius
* Shadows
* Layout

---

# Design Direction

Dativerso should feel like:

* Linear
* Vercel
* Stripe Dashboard
* Notion
* Perplexity

Characteristics:

```text
Premium

Professional

Minimal

Data-Centric

AI-First

Modern
```

---

# Theme

Default Theme:

```text
Light
```

Dark mode may be introduced later.

---

# Color System

## Primary

Brand Purple

```css
#6E5BFF
```

---

Primary Hover

```css
#5F4CF0
```

---

Primary Soft

```css
#F3F1FF
```

---

## Secondary

Brand Blue

```css
#5EC9FF
```

---

Secondary Soft

```css
#EEF9FF
```

---

# Neutral Scale

## Background

```css
#FFFFFF
```

---

## Surface

```css
#FAFBFC
```

---

## Surface Secondary

```css
#F4F6F8
```

---

## Border

```css
#E5E7EB
```

---

# Typography Colors

## Primary Text

```css
#111827
```

---

## Secondary Text

```css
#6B7280
```

---

## Muted Text

```css
#9CA3AF
```

---

# Semantic Colors

## Success

```css
#22C55E
```

---

Success Background

```css
#F0FDF4
```

---

## Warning

```css
#F59E0B
```

---

Warning Background

```css
#FFFBEB
```

---

## Error

```css
#EF4444
```

---

Error Background

```css
#FEF2F2
```

---

## Info

```css
#3B82F6
```

---

Info Background

```css
#EFF6FF
```

---

# Typography

## Font Family

Use:

```css
Inter
```

Fallback:

```css
sans-serif
```

---

# Font Sizes

## Page Title

```css
36px
700
```

---

## Section Title

```css
24px
600
```

---

## Card Title

```css
18px
600
```

---

## Body Large

```css
16px
400
```

---

## Body

```css
14px
400
```

---

## Caption

```css
12px
400
```

---

# Line Heights

## Large

```css
1.6
```

---

## Normal

```css
1.5
```

---

## Compact

```css
1.3
```

---

# Spacing Scale

## XS

```css
4px
```

---

## SM

```css
8px
```

---

## MD

```css
16px
```

---

## LG

```css
24px
```

---

## XL

```css
32px
```

---

## XXL

```css
48px
```

---

## Page Section

```css
64px
```

---

# Border Radius

## Small

```css
8px
```

---

## Medium

```css
12px
```

Default.

---

## Large

```css
16px
```

---

## XL

```css
24px
```

Hero cards only.

---

# Shadows

## Card

```css
0 1px 3px rgba(0,0,0,0.08)
```

---

## Elevated

```css
0 4px 12px rgba(0,0,0,0.08)
```

---

## Modal

```css
0 12px 32px rgba(0,0,0,0.12)
```

---

# Layout Tokens

## Sidebar Expanded

```css
260px
```

---

## Sidebar Collapsed

```css
72px
```

---

## Content Width

```css
1600px
```

---

## Content Padding

```css
32px
```

---

## Section Gap

```css
24px
```

---

## Card Gap

```css
16px
```

---

# Component Rules

## Cards

All cards must:

```text
White background

12px radius

Light border

Soft shadow
```

---

## Tables

Must:

```text
Use zebra rows only if necessary

Use sticky headers

Support responsive behavior
```

---

## Buttons

Primary:

```css
Purple Background

White Text
```

---

Secondary:

```css
White Background

Border

Dark Text
```

---

Ghost:

```css
Transparent
```

---

# Charts

Use:

```text
Clean

Minimal

No 3D

No gradients

No excessive colors
```

---

Maximum palette:

```text
Primary Purple

Blue

Green

Amber

Red
```

---

# AI Components

Assistant surfaces must:

```text
Feel calm

Not dominate the page

Always contextual

Always useful
```

Avoid:

```text
Large chatbot appearance

ChatGPT clone interface

Floating AI buttons
```

---

# Animations

Allowed:

```text
Fade

Slide

Skeleton Loading
```

Duration:

```css
150ms - 250ms
```

---

Avoid:

```text
Bounce

Spin

Elastic

Flashy effects
```

---

# Visual Quality Bar

Every screen should look closer to:

```text
Linear

Vercel

Stripe

Perplexity

Notion
```

Than:

```text
Bootstrap Admin

AdminLTE

Material Dashboard

Generic Enterprise CRUD
```

---

# Non-Negotiable Rules

1. No emojis in the UI.
2. No neon colors.
3. No glassmorphism.
4. No excessive gradients.
5. No dense screens.
6. No generic admin dashboard look.
7. Prioritize whitespace.
8. Prioritize readability.
9. AI should feel integrated, not bolted on.
10. Consistency is more important than visual experimentation.
