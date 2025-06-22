// Global type declarations for window properties
interface Window {
  __drivertasks_user: any | null;
  __drivertasks_isAdmin: boolean;
}

// Add global types to the Window interface
declare global {
  interface Window {
    __drivertasks_user: any | null;
    __drivertasks_isAdmin: boolean;
  }
} 