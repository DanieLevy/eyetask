import { useMixedFont } from '@/hooks/useFont';

export default function Footer() {
  const mixedBody = useMixedFont('body');
  
  return (
    <footer className="border-t border-border mt-6">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-sm text-muted-foreground">
          <p className={mixedBody.fontClass}>
            © 2025 Driver Tasks Mobileye. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
} 