import FontDemo from '@/components/FontDemo';

export default function FontDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">הדגמת גופנים - Font Demo</h1>
          <p className="text-sm text-muted-foreground">
            הדגמה של גופני Intel Display ו-Ploni במערכת Drivers Hub
          </p>
        </div>
      </div>
      <FontDemo />
    </div>
  );
} 