import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Mail, Lock, User, KeyRound, Eye, EyeOff, ArrowLeft,
  CheckCircle2, Send, RefreshCw, ExternalLink, Shield, Sparkles, Clock,
} from "lucide-react";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup", "forgot", "reset"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    redirect: search.redirect,
    mode: search.mode,
  }),
  loader: ({ deps }) => deps,
  head: ({ loaderData }) => {
    const mode = loaderData?.mode || "signin";
    let title = "Sign in · Yesp Leaders";
    if (mode === "signup") title = "Create Account · Yesp Leaders";
    else if (mode === "forgot") title = "Forgot Password · Yesp Leaders";
    else if (mode === "reset") title = "Reset Password · Yesp Leaders";

    const desc = "Join the Yesp Leaders community. Learn and share founding, development, creator, AI, and startup knowledge in the open.";
    return {
      meta: [
        { title },
        { name: "title", content: title },
        { property: "og:title", content: title },
        { name: "twitter:title", content: title },
        { name: "description", content: desc },
        { property: "og:description", content: desc },
        { name: "twitter:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://yespleaders.com/auth" },
        { property: "og:image", content: "https://yespleaders.com/logo.svg" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "https://yespleaders.com/logo.svg" },
        { property: "og:site_name", content: "Yesp Leaders" },
        { name: "geo.region", content: "US-CA" },
        { name: "geo.placename", content: "San Francisco" },
        { name: "geo.position", content: "37.7749;-122.4194" },
        { name: "ICBM", content: "37.7749, -122.4194" },
      ],
      links: [{ rel: "canonical", href: "https://yespleaders.com/auth" }],
    };
  },
  component: AuthPage,
});

const SENDING_STEPS = [
  { icon: Shield, label: "Verifying account details…" },
  { icon: Sparkles, label: "Generating secure signature…" },
  { icon: Send, label: "Dispatching secure link…" },
];

const MAIL_CLIENTS = [
  {
    name: "Gmail",
    url: "https://mail.google.com",
    color: "hover:border-red-400 hover:text-red-500",
    icon: "G",
  },
  {
    name: "Outlook",
    url: "https://outlook.live.com",
    color: "hover:border-blue-400 hover:text-blue-500",
    icon: "O",
  },
  {
    name: "Yahoo",
    url: "https://mail.yahoo.com",
    color: "hover:border-purple-400 hover:text-purple-500",
    icon: "Y",
  },
];

function AuthPage() {
  const { user } = useAuth();
  const { redirect, mode: searchMode } = Route.useSearch();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">("signin");

  useEffect(() => {
    if (searchMode) setMode(searchMode);
  }, [searchMode]);

  useEffect(() => {
    if (user && mode !== "reset") {
      navigate({ to: redirect || "/", replace: true });
    }
  }, [user, redirect, navigate, mode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStep, setSendStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Validation states
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null);

  // Real-time username validation
  const validateUsername = (value: string) => {
    const cleaned = value.toLowerCase().trim();
    if (!cleaned) {
      setUsernameError("");
      return;
    }
    if (cleaned.length < 3) {
      setUsernameError("Too short (min 3 chars)");
    } else if (cleaned.length > 30) {
      setUsernameError("Too long (max 30 chars)");
    } else if (!/^[a-z0-9_]+$/.test(cleaned)) {
      setUsernameError("Only letters, numbers, & underscores");
    } else {
      setUsernameError("");
    }
  };

  // Real-time password validation
  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("");
      setPasswordStrength(null);
      return;
    }
    if (value.length < 6) {
      setPasswordError("At least 6 characters required");
      setPasswordStrength(null);
    } else {
      setPasswordError("");
      // Calculate strength
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecial = /[^A-Za-z0-9]/.test(value);
      const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

      if (value.length >= 12 && score >= 3) {
        setPasswordStrength("strong");
      } else if (value.length >= 8 && score >= 2) {
        setPasswordStrength("medium");
      } else {
        setPasswordStrength("weak");
      }
    }
  };

  // Resend countdown
  const [resendCountdown, setResendCountdown] = useState(60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = () => {
    setResendCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (emailSent) startCountdown();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [emailSent]);

  const handleModeChange = (newMode: "signin" | "signup" | "forgot" | "reset") => {
    setMode(newMode);
    setEmailSent(false);
    setSending(false);
    setSendStep(0);
    navigate({ to: "/auth", search: { redirect, mode: newMode }, replace: true });
  };

  async function runSendingAnimation(): Promise<void> {
    setSending(true);
    for (let i = 0; i < SENDING_STEPS.length; i++) {
      setSendStep(i);
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const cleanedUsername = username.toLowerCase().trim();
        if (
          cleanedUsername.length < 3 ||
          cleanedUsername.length > 30 ||
          !/^[a-z0-9_]+$/.test(cleanedUsername)
        ) {
          throw new Error("Username must be 3-30 characters containing only letters, numbers, and underscores.");
        }
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanedUsername)
          .maybeSingle();
        if (existing) throw new Error("Username is already taken.");

        await runSendingAnimation();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { username: cleanedUsername, full_name: name || email.split("@")[0] },
          },
        });
        if (error) {
          console.error("Sign up error:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          throw error;
        }
        console.log("Sign up successful:", data);
        toast.success("Check your email to confirm your account.");
        setEmailSent(true);
        setSending(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Sign in error:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          throw error;
        }
        console.log("Sign in successful:", data);
        toast.success("Welcome back!");
      }
    } catch (err) {
      setSending(false);
      console.error("Auth error caught:", err);
      const errorMessage = err instanceof Error ? err.message : "Auth failed";
      console.error("Error message:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await runSendingAnimation();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/auth?mode=reset",
      });
      if (error) throw error;
      toast.success("Password recovery link sent!");
      setEmailSent(true);
      setSending(false);
    } catch (err) {
      setSending(false);
      toast.error(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/auth?mode=reset",
      });
      toast.success("New recovery link sent!");
      startCountdown();
    } catch {
      toast.error("Failed to resend. Try again shortly.");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully!");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  /* ─── Sending Animation Screen ──────────────────────────── */
  if (sending) {
    const StepIcon = SENDING_STEPS[sendStep]?.icon ?? Send;
    return (
      <div className="container-narrow py-16 flex items-center justify-center min-h-[75vh]">
        <div className="relative max-w-md w-full bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl p-10 overflow-hidden text-center">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          {/* Animated paper-plane wrapper */}
          <div className="relative mx-auto mb-8 w-20 h-20 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full bg-primary/8 animate-ping"
              style={{ animationDuration: "1.4s" }}
            />
            <div className="relative z-10 w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <StepIcon
                className="w-7 h-7 text-primary"
                style={{
                  animation: "sendPlane 0.5s ease-in-out",
                }}
              />
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-surface-2 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${((sendStep + 1) / SENDING_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Step checklist */}
          <ul className="space-y-3 text-left mb-6">
            {SENDING_STEPS.map((step, i) => {
              const done = i < sendStep;
              const active = i === sendStep;
              const StepItemIcon = step.icon;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border transition-all duration-300 ${
                      done
                        ? "bg-primary text-primary-foreground border-primary"
                        : active
                        ? "border-primary text-primary animate-pulse"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : <StepItemIcon className="w-3 h-3" />}
                  </span>
                  <span
                    className={`text-sm transition-colors duration-300 ${
                      done
                        ? "text-foreground line-through opacity-60"
                        : active
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-muted-foreground">This takes just a moment…</p>
        </div>
      </div>
    );
  }

  /* ─── Email Sent Success Screen ─────────────────────────── */
  if (emailSent) {
    return (
      <div className="container-narrow py-16 flex items-center justify-center min-h-[75vh]">
        <div className="relative max-w-md w-full bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl p-8 overflow-hidden text-center">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto mb-6 w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/8" />
            <CheckCircle2 className="relative z-10 w-10 h-10 text-primary" />
          </div>

          <h1 className="font-serif text-2xl font-bold mb-2">Check your inbox</h1>
          <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
            We've sent a secure link to{" "}
            <strong className="text-foreground font-semibold">{email}</strong>.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Didn't get it? Check spam or use a quick-launch below.
          </p>

          {/* Quick-launch mail buttons */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {MAIL_CLIENTS.map((client) => (
              <a
                key={client.name}
                href={client.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-all duration-200 group cursor-pointer ${client.color}`}
              >
                <span className="font-bold text-lg leading-none">{client.icon}</span>
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground font-medium transition-colors">
                  {client.name}
                </span>
                <ExternalLink className="w-3 h-3 text-muted-foreground/60 group-hover:text-foreground/60" />
              </a>
            ))}
          </div>

          {/* Countdown / Resend */}
          <div className="mb-5">
            {resendCountdown > 0 ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Resend available in <strong className="text-foreground tabular-nums">{resendCountdown}s</strong></span>
              </div>
            ) : (
              <button
                onClick={handleResend}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-xs text-primary font-semibold hover:bg-primary/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Resend Link
              </button>
            )}
          </div>

          <button
            onClick={() => handleModeChange("signin")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  /* ─── Main Form ─────────────────────────────────────────── */
  return (
    <div className="container-narrow py-16 flex items-center justify-center min-h-[80vh]">
      <div className="relative max-w-md w-full bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl p-8 overflow-hidden transition-all duration-300">
        {/* Glowing Background Blur Effects */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {(mode === "forgot" || mode === "reset") && (
          <button
            onClick={() => handleModeChange("signin")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </button>
        )}

        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold leading-tight">
            {mode === "signin" && "Welcome back"}
            {mode === "signup" && "Join the leaders"}
            {mode === "forgot" && "Reset Password"}
            {mode === "reset" && "Set new password"}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {mode === "signin" && "Sign in to access your feed and upvote leaders."}
            {mode === "signup" && "Share lessons. Get discovered by Google & AI engines."}
            {mode === "forgot" && "We'll email you a link to reset your password."}
            {mode === "reset" && "Choose a secure password for your account."}
          </p>
        </div>

        {/* Tab switcher */}
        {(mode === "signin" || mode === "signup") && (
          <div className="flex bg-surface-2 border border-border p-1 rounded-lg mb-6">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>
        )}

        {/* ── Reset password form ── */}
        {mode === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {[
              { label: "New Password", val: password, set: setPassword, show: showPassword, toggle: () => setShowPassword(!showPassword) },
              { label: "Confirm New Password", val: confirmPassword, set: setConfirmPassword, show: showConfirmPassword, toggle: () => setShowConfirmPassword(!showConfirmPassword) },
            ].map(({ label, val, set, show, toggle }) => (
              <div key={label}>
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <div className="relative mt-1">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all placeholder:text-muted-foreground/60"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <button disabled={loading} className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-md mt-2">
              {loading ? "Updating password…" : "Update Password"}
            </button>
          </form>
        )}

        {/* ── Forgot password form ── */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all placeholder:text-muted-foreground/60"
                  placeholder="you@startup.com"
                />
              </div>
            </div>
            <button disabled={loading} className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-md mt-2">
              {loading ? "Sending link…" : "Send Reset Link"}
            </button>
          </form>
        )}

        {/* ── Sign in / Sign up form ── */}
        {(mode === "signin" || mode === "signup") && (
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Username</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        validateUsername(e.target.value);
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all placeholder:text-muted-foreground/60 ${
                        usernameError ? "border-destructive focus:ring-destructive/40" : "border-border"
                      }`}
                      placeholder="johndoe"
                      maxLength={30}
                    />
                  </div>
                  {usernameError ? (
                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                      <span className="font-medium">{usernameError}</span>
                    </p>
                  ) : username && !usernameError ? (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Looks good!</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      3-30 characters • Letters, numbers, underscores only
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input required value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all placeholder:text-muted-foreground/60"
                      placeholder="Your name" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all placeholder:text-muted-foreground/60"
                  placeholder="you@startup.com" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                {mode === "signin" && (
                  <button type="button" onClick={() => handleModeChange("forgot")}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (mode === "signup") validatePassword(e.target.value);
                  }}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all placeholder:text-muted-foreground/60 ${
                    passwordError ? "border-destructive focus:ring-destructive/40" : "border-border"
                  }`}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "signup" && (
                <>
                  {passwordError ? (
                    <p className="text-xs text-destructive mt-1.5 font-medium">{passwordError}</p>
                  ) : password.length >= 6 ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength === "strong"
                                ? "w-full bg-green-500"
                                : passwordStrength === "medium"
                                ? "w-2/3 bg-yellow-500"
                                : "w-1/3 bg-red-500"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            passwordStrength === "strong"
                              ? "text-green-600 dark:text-green-400"
                              : passwordStrength === "medium"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {passwordStrength === "strong" ? "Strong" : passwordStrength === "medium" ? "Medium" : "Weak"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        💡 Add uppercase, numbers & symbols for a stronger password
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1.5">Minimum 6 characters</p>
                  )}
                </>
              )}
            </div>

            <button disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-md mt-2">
              {loading ? "Loading…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing you agree to the community guidelines.{" "}
          <Link to="/" className="text-primary font-medium hover:underline">Back home</Link>
        </p>
      </div>
    </div>
  );
}
