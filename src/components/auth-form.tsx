"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Store } from "lucide-react";
import { browserClient } from "@/lib/supabase/client";
export type AuthMode = "login" | "signup" | "forgot" | "reset";
export function AuthForm({
  mode,
  configured,
  verificationError = false,
}: {
  mode: AuthMode;
  configured: boolean;
  verificationError?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    verificationError
      ? "That verification link is invalid or expired. Please request a new one."
      : "",
  );
  const title =
    mode === "login"
      ? "Good to see you again."
      : mode === "signup"
        ? "Big dreams start small."
        : mode === "forgot"
          ? "Let’s get you back in."
          : "A fresh start.";
  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = browserClient();
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");
      if (
        (mode === "signup" || mode === "reset") &&
        password !== form.get("confirm")
      )
        throw new Error("Passwords do not match.");
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/pos");
        router.refresh();
      }
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: String(form.get("name")),
              store_name: String(form.get("store_name")),
            },
            emailRedirectTo: window.location.origin + "/auth/callback",
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/pos");
          router.refresh();
        } else
          setMessage("Check your email to verify your account, then sign in.");
      }
      if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo:
            window.location.origin + "/auth/callback?next=/reset-password",
        });
        if (error) throw error;
        setMessage(
          "If that account exists, a password reset link is on its way. Check your inbox.",
        );
      }
      if (mode === "reset") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setMessage(
          "Your password was updated. You can now open your workspace.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to continue. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link href="/" className="brand">
          <Image src="/brand/logo.svg" alt="" width={46} height={46} />
          <span>
            Tinda<span className="brand-highlight">Hub</span>
          </span>
        </Link>
        <div className="auth-story-content">
          <span className="auth-kicker">FOR THE EVERYDAY ENTREPRENEUR</span>
          <h2>
            Your neighborhood.
            <br />
            Your store.
            <br />
            <em>Your next chapter.</em>
          </h2>
          <p>
            Every sale, every paninda, every little win.
            <br />A better day at the store starts here.
          </p>
          <div className="auth-illustration" aria-hidden="true">
            <Store size={110} strokeWidth={1} />
            <span className="auth-orbit">✦</span>
            <span className="auth-illustration-caption">
              OPEN FOR POSSIBILITIES
            </span>
          </div>
        </div>
        <span className="auth-story-footer">
          Built for sari-sari stores. Made for you.
        </span>
      </section>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <p className="eyebrow">
            {mode === "signup"
              ? "JOIN THE NEIGHBORHOOD"
              : "YOUR STORE, IN GOOD HANDS"}
          </p>
          <h1>{title}</h1>
          <p className="auth-description">
            {mode === "login"
              ? "Sign in and make today a good day for business."
              : mode === "signup"
                ? "Create your account. Take the next step for your store."
                : mode === "forgot"
                  ? "Enter your email and we’ll send a password reset link."
                  : "Choose a strong new password for your account."}
          </p>
          {!configured && (
            <div className="auth-demo-note">
              <strong>Explore TindaHub first</strong>
              <p>
                The demo uses fictional data saved only in this browser. Real
                accounts become available when your Supabase project is
                connected.
              </p>
              <Link href="/pos" className="button button-primary">
                Open demo workspace
                <ArrowRight size={18} />
              </Link>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(new FormData(e.currentTarget));
            }}
          >
            {mode === "signup" && (
              <>
                <label className="field">
                  <span>Your name</span>
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    disabled={!configured}
                  />
                </label>
                <label className="field">
                  <span>Store name</span>
                  <input
                    name="store_name"
                    autoComplete="organization"
                    required
                    maxLength={160}
                    disabled={!configured}
                  />
                </label>
              </>
            )}
            {mode !== "reset" && (
              <label className="field">
                <span>Email address</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  disabled={!configured}
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label className="field">
                <span>{mode === "reset" ? "New password" : "Password"}</span>
                <span className="password-field">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "login" ? 1 : 8}
                    required
                    disabled={!configured}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={show ? "Hide password" : "Show password"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
            )}
            {(mode === "signup" || mode === "reset") && (
              <label className="field">
                <span>Confirm password</span>
                <input
                  name="confirm"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={!configured}
                />
              </label>
            )}
            {mode === "login" && (
              <Link className="forgot-link" href="/forgot-password">
                Forgot password?
              </Link>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="form-success" role="status">
                {message}
              </p>
            )}
            <button
              className="button button-primary auth-submit"
              disabled={busy || !configured}
            >
              {busy
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Update password"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {mode === "login" ? (
              <>
                New to TindaHub? <Link href="/signup">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account? <Link href="/login">Sign in</Link>
              </>
            )}
          </p>
          {mode === "reset" && message && (
            <Link href="/pos" className="button">
              Open workspace
            </Link>
          )}
          <div className="auth-trust">
            <ShieldCheck size={16} />
            <span>Your store’s next chapter is yours to write.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
