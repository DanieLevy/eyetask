import { useMemo } from 'react';
import { 
  FontWeight, 
  Language, 
  FontConfig,
  getFontFamily,
  getFontClassName,
  createFontConfig,
  detectLanguage,
  fontConfigs
} from '@/lib/fonts';

interface UseFontOptions {
  language?: Language;
  element?: 'heading' | 'body' | 'caption' | 'button';
  weight?: FontWeight;
  autoDetect?: boolean;
}

interface UseFontReturn {
  fontClass: string;
  fontConfig: FontConfig;
  language: Language;
  isHebrew: boolean;
  isEnglish: boolean;
  isMixed: boolean;
  direction: 'rtl' | 'ltr';
  textAlign: 'right' | 'left' | 'center';
}

export function useFont(text?: string, options: UseFontOptions = {}): UseFontReturn {
  const {
    language: preferredLanguage,
    element = 'body',
    weight,
    autoDetect = true
  } = options;

  const detectedLanguage = useMemo(() => {
    if (preferredLanguage) {
      return preferredLanguage;
    }
    
    if (autoDetect && text) {
      return detectLanguage(text);
    }
    
    return 'mixed';
  }, [text, preferredLanguage, autoDetect]);

  const fontConfig = useMemo(() => {
    if (weight) {
      // Custom weight specified
      const family = getFontFamily(detectedLanguage);
      const className = getFontClassName(family, weight);
      return {
        family,
        weight,
        className
      };
    } else {
      // Use recommended configuration
      return createFontConfig(detectedLanguage, element);
    }
  }, [detectedLanguage, element, weight]);

  const direction = useMemo(() => {
    return detectedLanguage === 'he' ? 'rtl' : 'ltr';
  }, [detectedLanguage]);

  const textAlign = useMemo(() => {
    return detectedLanguage === 'he' ? 'right' : 'left';
  }, [detectedLanguage]);

  return {
    fontClass: fontConfig.className,
    fontConfig,
    language: detectedLanguage,
    isHebrew: detectedLanguage === 'he',
    isEnglish: detectedLanguage === 'en',
    isMixed: detectedLanguage === 'mixed',
    direction,
    textAlign
  };
}

// Predefined hooks for common use cases
export function useHebrewFont(element: 'heading' | 'body' | 'caption' | 'button' = 'body', customWeight?: FontWeight) {
  return useFont('', { language: 'he', element, weight: customWeight });
}

export function useEnglishFont(element: 'heading' | 'body' | 'caption' | 'button' = 'body', customWeight?: FontWeight) {
  return useFont('', { language: 'en', element, weight: customWeight });
}

export function useMixedFont(element: 'heading' | 'body' | 'caption' | 'button' = 'body', customWeight?: FontWeight) {
  return useFont('', { language: 'mixed', element, weight: customWeight });
}

// Hook for getting font class names directly
export function useFontClass(text?: string, options: UseFontOptions = {}): string {
  const { fontClass } = useFont(text, options);
  return fontClass;
}

// Hook for getting predefined font configurations
export function usePredefinedFont(configName: keyof typeof fontConfigs): FontConfig {
  return useMemo(() => fontConfigs[configName], [configName]);
} 