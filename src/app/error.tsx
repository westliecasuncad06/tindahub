"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="onboarding">
      <div className="onboarding-card">
        <h1>Something interrupted your workspace.</h1>
        <p>
          Please try again. If this continues, check the application’s
          environment settings and database connection.
        </p>
        <button className="button button-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
