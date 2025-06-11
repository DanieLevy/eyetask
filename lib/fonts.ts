// Font configuration and utilities for Driver Tasks
export type FontFamily = 'intel' | 'ploni' | 'hebrew' | 'english' | 'mixed';
export type FontWeight = 'ultralight' | 'light' | 'regular' | 'medium' | 'bold';
export type Language = 'he' | 'en' | 'mixed';

export interface FontConfig {
  family: FontFamily;
  weight: FontWeight;
  className: string;
}

// Font weight mappings for Intel fonts
export const intelWeights = {
  light: 300,      // intelone-display-light
  regular: 400,    // intelone-display-regular
  medium: 500,     // intelone-display-medium
  bold: 700,       // intelone-display-bold (use sparingly)
} as const;

// Font weight mappings for Ploni fonts
export const ploniWeights = {
  ultralight: 200, // ploni-ultralight-aaa
  light: 300,      // ploni-light-aaa
  regular: 400,    // ploni-regular-aaa
} as const;

// Get appropriate font family based on language
export function getFontFamily(language: Language): FontFamily {
  switch (language) {
    case 'he':
      return 'hebrew';
    case 'en':
      return 'english';
    case 'mixed':
    default:
      return 'mixed';
  }
}

// Get font class name for Tailwind
export function getFontClassName(family: FontFamily, weight?: FontWeight): string {
  const baseClass = `font-${family}`;
  const weightClass = weight ? `font-${weight}` : '';
  return [baseClass, weightClass].filter(Boolean).join(' ');
}

// Detect language from text content
export function detectLanguage(text: string): Language {
  const hebrewRegex = /[\u0590-\u05FF]/;
  const englishRegex = /[a-zA-Z]/;
  
  const hasHebrew = hebrewRegex.test(text);
  const hasEnglish = englishRegex.test(text);
  
  if (hasHebrew && hasEnglish) {
    return 'mixed';
  } else if (hasHebrew) {
    return 'he';
  } else if (hasEnglish) {
    return 'en';
  } else {
    return 'mixed'; // default for neutral content
  }
}

// Get recommended font weight for different UI elements
export function getRecommendedWeight(element: 'heading' | 'body' | 'caption' | 'button', language: Language): FontWeight {
  if (language === 'he') {
    // Ploni font recommendations
    switch (element) {
      case 'heading':
        return 'regular';
      case 'body':
        return 'light';
      case 'caption':
        return 'ultralight';
      case 'button':
        return 'regular';
      default:
        return 'light';
    }
  } else {
    // Intel font recommendations
    switch (element) {
      case 'heading':
        return 'medium';
      case 'body':
        return 'regular';
      case 'caption':
        return 'light';
      case 'button':
        return 'medium';
      default:
        return 'regular';
    }
  }
}

// Create complete font configuration
export function createFontConfig(language: Language, element: 'heading' | 'body' | 'caption' | 'button'): FontConfig {
  const family = getFontFamily(language);
  const weight = getRecommendedWeight(element, language);
  const className = getFontClassName(family, weight);
  
  return {
    family,
    weight,
    className
  };
}

// Predefined font configurations for common use cases
export const fontConfigs = {
  // Hebrew configurations
  hebrewHeading: createFontConfig('he', 'heading'),
  hebrewBody: createFontConfig('he', 'body'),
  hebrewCaption: createFontConfig('he', 'caption'),
  hebrewButton: createFontConfig('he', 'button'),
  
  // English configurations
  englishHeading: createFontConfig('en', 'heading'),
  englishBody: createFontConfig('en', 'body'),
  englishCaption: createFontConfig('en', 'caption'),
  englishButton: createFontConfig('en', 'button'),
  
  // Mixed content configurations
  mixedHeading: createFontConfig('mixed', 'heading'),
  mixedBody: createFontConfig('mixed', 'body'),
  mixedCaption: createFontConfig('mixed', 'caption'),
  mixedButton: createFontConfig('mixed', 'button'),
} as const; 