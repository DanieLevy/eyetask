// Global type declarations for window properties
interface Window {
  __drivertasks_user: { id: string; username: string; email?: string; role: string } | null;
  __drivertasks_isAdmin: boolean;
}

// Add global types to the Window interface
declare global {
  interface Window {
    __drivertasks_user: { id: string; username: string; email?: string; role: string } | null;
    __drivertasks_isAdmin: boolean;
  }
} 