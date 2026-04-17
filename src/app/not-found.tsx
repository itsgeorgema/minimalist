import Link from "next/link";

export default function NotFound() {
  return (
    <main className="vercel-not-found">
      <div className="vercel-not-found__content">
        <h1>404</h1>
        <div className="vercel-not-found__divider" aria-hidden="true" />
        <p>This page could not be found.</p>
      </div>
      <Link href="/" className="vercel-not-found__home">
        Go Home
      </Link>
    </main>
  );
}
