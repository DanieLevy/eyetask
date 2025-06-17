// Global type declarations for window properties
interface Window {
  __eyetask_user: any | null;
  __eyetask_isAdmin: boolean;
}

// Add global types to the Window interface
declare global {
  interface Window {
    __eyetask_user: any | null;
    __eyetask_isAdmin: boolean;
  }
} 