import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-white font-brand lowercase"
          >
            Fruitful Rooms
          </Link>
          <Link
            href="/listings"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Browse Rooms
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20 bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-white">
            Find Your Next Room
          </h1>
          <p className="text-lg sm:text-xl text-white/85 mb-8 max-w-lg mx-auto">
            Affordable co-living spaces with everything you need. No brokers, no
            hassle — just quality rooms at fair prices.
          </p>
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 bg-cta text-white font-semibold px-8 py-3 rounded-full text-lg hover:bg-cta-hover transition-colors"
          >
            Browse Available Rooms
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 bg-card-bg">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12 text-foreground">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-gradient-start to-gradient-mid text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Browse</h3>
              <p className="text-muted text-sm">
                Explore available rooms with photos, pricing, and amenity details.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-cta text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Apply</h3>
              <p className="text-muted text-sm">
                Found the right fit? Reach out and apply — simple and straightforward.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-gradient-mid to-gradient-end text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Move In</h3>
              <p className="text-muted text-sm">
                Get approved, sign your agreement, and move into your new home.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-card-border py-6 px-4">
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
    </div>
  );
}
