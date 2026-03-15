import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-card-border py-6 px-4 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted">
        <p>&copy; {new Date().getFullYear()} Fruitful Rooms Rentals. All rights reserved.</p>
        <Link
          href="/admin"
          className="text-xs text-muted/50 hover:text-muted transition-colors"
        >
          Admin
        </Link>
      </div>
    </footer>
  );
}
