import Link from "next/link";
export default function NotFound() {
  return (
    <main className="onboarding">
      <div className="onboarding-card">
        <p className="eyebrow">404 / LOST IN THE NEIGHBORHOOD</p>
        <h1>Let’s head back to the store.</h1>
        <p>This page is not available.</p>
        <Link href="/pos" className="button button-primary">
          Back to TindaHub
        </Link>
      </div>
    </main>
  );
}
