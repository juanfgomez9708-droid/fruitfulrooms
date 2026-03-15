import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-card-border bg-card-bg">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end bg-clip-text text-transparent font-brand lowercase">
          Fruitful Rooms
        </Link>
        <Link
          href="/listings"
          className="text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          Browse Rooms
        </Link>
      </div>
    </header>
  );
}
