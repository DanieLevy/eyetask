# UI Design Guidelines - Flat Monochromatic Style

## Overview
This document defines the design system used for loading states, progress indicators, and information displays in the DATACO Analyzer application.

## Color Palette

### Primary Colors (Monochromatic)
```css
/* Background & Surfaces */
Background: bg-gradient-to-br from-slate-50 via-white to-slate-100
Surface: bg-white/90 backdrop-blur-sm
Border: border-slate-200

/* Text */
Primary Text: text-slate-900
Secondary Text: text-slate-700
Tertiary Text: text-slate-600
Muted Text: text-slate-500

/* Interactive Elements */
Hover: hover:text-slate-900
Active: bg-slate-100
```

### Accent Colors (Minimal Use)
```css
/* Status Indicators */
Success: text-green-600, bg-green-50, border-green-200
Info: text-blue-700, bg-blue-50
Loading: text-slate-600 (with spinner)

/* Tags & Badges */
Tag Background: bg-slate-100 or bg-blue-50
Tag Text: text-slate-700 or text-blue-700
Tag Border: border-slate-200 or border-blue-200
```

## Typography

### Hierarchy
```css
/* Headings */
Page Title: text-2xl font-light text-slate-700
Section Title: text-base font-medium text-slate-800
Subsection: text-sm font-semibold text-slate-700

/* Body Text */
Primary: text-sm text-slate-700
Secondary: text-xs text-slate-500
Caption: text-xs text-slate-500

/* Labels */
Uppercase Label: text-xs font-medium text-slate-500 uppercase tracking-wide
```

### Font Weights
- `font-light` (300): Large titles, hero text
- `font-medium` (500): Section headers, labels
- `font-semibold` (600): Important labels, subheaders

## Layout Principles

### Spacing
```css
/* Container Padding */
Outer Container: px-4 sm:px-6 lg:px-8 py-6
Section Padding: p-6
Card Padding: p-4 or p-6

/* Gaps */
Large: space-y-6 or gap-6
Medium: space-y-4 or gap-4
Small: space-y-2 or gap-2
Minimal: gap-1.5
```

### Borders & Shadows
```css
/* NO heavy borders or cards */
Border: border border-slate-200 (1px solid, subtle)
Shadow: shadow-sm (minimal)
Radius: rounded-xl (12px) or rounded-md (6px)

/* Avoid */
❌ shadow-2xl, shadow-lg
❌ Heavy gradients
❌ Multiple border layers
```

## Component Patterns

### Progress Indicators

#### Step Circle
```tsx
<div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
  {isActive ? (
    <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
  ) : (
    <CheckCircle2 className="w-5 h-5 text-green-600" />
  )}
</div>
```

#### Progress Bar
```tsx
<div className="w-full bg-slate-100 rounded-full h-2.5">
  <motion.div
    className="h-full bg-slate-700"
    animate={{ width: `${progress}%` }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  />
</div>
```

### Tags & Badges

#### Standard Tag
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
  {tagName}
</span>
```

#### Muted Tag (Not Found)
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200 line-through">
  {tagName}
</span>
```

### Information Displays

#### Label-Value Pair
```tsx
<div>
  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">
    Label
  </span>
  <span className="text-lg font-semibold text-slate-900">
    Value
  </span>
</div>
```

#### Stats Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <div>
    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">
      Metric Name
    </span>
    <span className="text-lg font-semibold text-slate-900">123</span>
  </div>
</div>
```

### Loading States

#### Company Logo
```tsx
<div className="flex justify-center mb-8">
  <Image
    src="/images/mobileye-logo-horizontal-black.svg"
    alt="Mobileye"
    width={180}
    height={40}
    priority
    className="opacity-70"
  />
</div>
```

#### Step Layout
```tsx
<div className="flex items-start gap-6 mb-8">
  {/* Step Circle */}
  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
    <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
  </div>

  {/* Step Content */}
  <div className="flex-1 pt-2">
    <h3 className="text-base font-medium text-slate-800 mb-1">
      Step Title
    </h3>
    <p className="text-sm text-slate-500">
      Description text
    </p>
  </div>
</div>
```

## Animation Guidelines

### Transitions
```css
/* Standard */
transition-colors duration-200
transition-all duration-200

/* Smooth Animations */
transition={{ duration: 0.5, ease: "easeOut" }}
transition={{ duration: 0.4 }}
```

### Motion (Framer Motion)
```tsx
/* Fade In */
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
/>

/* Staggered Tags */
<motion.span
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: idx * 0.03 }}
/>
```

## Do's and Don'ts

### ✅ DO
- Use flat design with minimal shadows
- Keep borders subtle (1px, slate-200)
- Use monochromatic colors (slate scale)
- Apply color sparingly for status/success
- Use spacing consistently
- Keep font weights light-to-medium
- Use opacity for hierarchy
- Center company logo

### ❌ DON'T
- Use heavy gradients as backgrounds
- Add multiple border layers
- Use bright colors for backgrounds
- Apply heavy shadows (shadow-xl, shadow-2xl)
- Use bold fonts everywhere
- Mix multiple color schemes
- Add unnecessary cards/containers
- Use blue headers or colored sections

## Accessibility

### Contrast Ratios
- Ensure text meets WCAG AA standards
- slate-900 on white: ✅ AAA
- slate-700 on white: ✅ AA
- slate-500 on white: ✅ AA (large text)

### Interactive Elements
```tsx
/* Buttons */
className="hover:text-slate-900 transition-colors"
tabIndex={0}
role="button"

/* Focus States */
focus:outline-none focus:ring-2 focus:ring-slate-400
```

## Example Implementations

### Hero Section
```tsx
<div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm overflow-hidden">
  <div className="p-6">
    <div className="flex items-center gap-2 mb-4">
      <Sparkles className="w-4 h-4 text-slate-400" />
      <h3 className="text-sm font-semibold text-slate-700">Section Title</h3>
    </div>
    
    <div className="mb-3">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        Label
      </span>
      <p className="text-sm text-slate-700 mt-1">Content</p>
    </div>
  </div>
</div>
```

### Progress Section
```tsx
<div className="mt-12 pt-6 border-t border-slate-200">
  <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
    <span className="font-medium">Progress Label</span>
    <span className="text-slate-900 font-semibold">66%</span>
  </div>
  <div className="w-full bg-slate-100 rounded-full h-2.5">
    <motion.div
      className="h-full bg-slate-700"
      animate={{ width: "66%" }}
    />
  </div>
</div>
```

---

**Last Updated:** 2025-01-22
**Version:** 1.0
**Applies To:** Loading states, info displays, progress indicators

