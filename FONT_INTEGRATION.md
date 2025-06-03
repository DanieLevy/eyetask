# EyeTask Font Integration

This document describes the font integration system for EyeTask, which includes both **Intel Display** fonts for English content and **Ploni** fonts for Hebrew content.

## Font Files

### Intel Display Fonts (English)
Located in `/public/Fonts/`:
- `intelone-display-light.ttf` - Light weight (300)
- `intelone-display-regular.ttf` - Regular weight (400) 
- `intelone-display-medium.ttf` - Medium weight (500)

### Ploni Fonts (Hebrew)
Located in `/public/Fonts/`:
- `ploni-ultralight-aaa.otf` - Ultralight weight (200)
- `ploni-light-aaa.otf` - Light weight (300)
- `ploni-regular-aaa.otf` - Regular weight (400)

## Font Configuration

### Global CSS (`app/globals.css`)
The fonts are configured with `@font-face` declarations and CSS custom properties for easy switching between languages.

### Tailwind Configuration (`tailwind.config.js`)
Extended font families:
- `font-intel` - Intel Display fonts
- `font-ploni` - Ploni fonts
- `font-hebrew` - Hebrew text (Ploni with fallbacks)
- `font-english` - English text (Intel with fallbacks)
- `font-mixed` - Mixed content (Ploni + Intel with fallbacks)
- `font-sans` - Default (mixed fonts)

### Font Utilities (`lib/fonts.ts`)
TypeScript utilities for font management:
- Language detection
- Font family selection
- Weight recommendations
- Class name generation

## Usage

### 1. React Hooks (`hooks/useFont.ts`)

#### Basic Usage
```tsx
import { useFont, useHebrewFont, useEnglishFont } from '@/hooks/useFont';

function MyComponent() {
  const hebrewHeading = useHebrewFont('heading');
  const englishBody = useEnglishFont('body');
  const autoDetected = useFont("Hello שלום"); // Auto-detects mixed content
  
  return (
    <div>
      <h1 className={hebrewHeading.fontClass}>כותרת עברית</h1>
      <p className={englishBody.fontClass}>English paragraph</p>
      <span className={autoDetected.fontClass}>Mixed content</span>
    </div>
  );
}
```

#### Available Hooks
- `useFont(text?, options)` - Auto-detect or specify language
- `useHebrewFont(element, weight?)` - Force Hebrew fonts
- `useEnglishFont(element, weight?)` - Force English fonts  
- `useMixedFont(element, weight?)` - Mixed content fonts
- `useFontClass(text?, options)` - Get class name only

#### Element Types
- `'heading'` - For titles and headings
- `'body'` - For main content text
- `'caption'` - For small text and captions
- `'button'` - For button text

### 2. Direct Tailwind Classes

#### Hebrew Text
```html
<h1 class="font-hebrew font-regular">כותרת ראשית</h1>
<p class="font-hebrew font-light">תוכן עברי</p>
<small class="font-hebrew font-ultralight">טקסט קטן</small>
```

#### English Text
```html
<h1 class="font-english font-medium">Main Title</h1>
<p class="font-english font-regular">English content</p>
<small class="font-english font-light">Small text</small>
```

#### Mixed Content
```html
<div class="font-mixed font-regular">
  Project: תל אביב DATACO-2024-001
</div>
```

### 3. Font Weights

#### Hebrew (Ploni)
- `font-ultralight` (200) - Very light text, captions
- `font-light` (300) - Body text, descriptions
- `font-regular` (400) - Headings, emphasized text

#### English (Intel)
- `font-light` (300) - Captions, secondary text
- `font-regular` (400) - Body text
- `font-medium` (500) - Headings, buttons
- `font-bold` (700) - Use sparingly

## Best Practices

### 1. Language-Specific Usage
- Use `font-hebrew` for pure Hebrew text
- Use `font-english` for pure English text  
- Use `font-mixed` for mixed Hebrew/English content
- Auto-detection works well for dynamic content

### 2. Weight Guidelines
- **Hebrew**: Prefer lighter weights (ultralight/light for body, regular for headings)
- **English**: Use medium weights for headings, regular for body
- **Bold**: Use sparingly, primarily for Intel fonts

### 3. RTL/LTR Handling
The font hooks automatically set:
- `direction: 'rtl'` for Hebrew content
- `direction: 'ltr'` for English content
- Appropriate text alignment

### 4. Fallback Fonts
Each font family includes proper fallbacks:
- Hebrew: `'Ploni', 'Arial Hebrew', 'Arial Unicode MS', sans-serif`
- English: `'Intel Display', 'Segoe UI', 'Tahoma', 'Geneva', 'Verdana', sans-serif`

## Demo Page

Visit `/font-demo` to see all fonts and weights in action with:
- Hebrew font examples
- English font examples  
- Mixed content examples
- Font weight demonstrations
- Tailwind class references

## Examples in EyeTask

### Admin Dashboard
```tsx
const hebrewHeading = useHebrewFont('heading');
const mixedBody = useMixedFont('body');

<h1 className={hebrewHeading.fontClass}>EyeTask - לוח בקרה</h1>
<p className={mixedBody.fontClass}>שלום {user?.username} | Mobileye Admin</p>
```

### Task Cards
```tsx
<h3 className="font-hebrew font-regular">{task.title}</h3>
<p className="font-mixed font-light">DATACO: {task.datacoNumber}</p>
```

### Forms
```tsx
<label className="font-hebrew font-regular">כותרת המשימה</label>
<input className="font-mixed font-regular" placeholder="הזן כותרת..." />
```

## Technical Notes

### Font Loading
- Uses `font-display: swap` for better performance
- Fonts are loaded from `/public/Fonts/` directory
- Proper MIME types for `.ttf` and `.otf` files

### CSS Variables
Global CSS variables available:
- `--font-english` - Intel Display stack
- `--font-hebrew` - Ploni stack  
- `--font-mixed` - Combined stack

### TypeScript Support
Full TypeScript support with:
- Type-safe font configurations
- IntelliSense for font options
- Compile-time validation

## Troubleshooting

### Fonts Not Loading
1. Check font files are in `/public/Fonts/`
2. Verify MIME types in server configuration
3. Check browser DevTools for 404 errors

### Mixed Content Issues
1. Use `font-mixed` for content with both languages
2. Auto-detection works with `useFont(text)`
3. Manual override with language option

### Performance
1. Fonts use `font-display: swap`
2. Proper fallback fonts prevent layout shift
3. Consider preloading critical fonts 