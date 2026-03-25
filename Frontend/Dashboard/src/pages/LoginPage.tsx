// Dashboard/src/pages/LoginPage.tsx

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { staffLogin, staffRegister, staffVerifyOtp } from "@/api";
import { UtensilsCrossed } from "lucide-react";

type Step = "credentials" | "otp";
type Tab = "login" | "register";
type LoginMethod = "email" | "phone";

const ROLES = ["admin", "manager", "chef", "staff"] as const;

export default function LoginPage() {
  const { login } = useAuth();

  const [tab, setTab] = useState<Tab>("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [step, setStep] = useState<Step>("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Credentials form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("staff");

  // OTP state (only used for email login and register)
  const [otp, setOtp] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const resetForm = () => {
    setStep("credentials");
    setOtp("");
    setError("");
    setPendingName("");
    setPendingEmail("");
  };

  const handleTabSwitch = (t: Tab) => {
    setTab(t);
    resetForm();
  };

  // ── Step 1: Submit credentials ─────────────────────────────────────────────
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "register") {
        // Register always uses email OTP
        const res = await staffRegister({ name, email, phone, role });
        if (res.status === "error") { setError(res.message); return; }
        setPendingName(name);
        setPendingEmail(email);
        setStep("otp");

      } else if (loginMethod === "email") {
        // Email login → OTP
        const res = await staffLogin({ method: "email", value: email });
        if (res.status === "not_found" || res.status === "error") {
          setError(res.message || "Account not found. Please register first.");
          return;
        }
        setPendingName(res.name || "");
        setPendingEmail(email);
        setStep("otp");

      } else {
        // Phone login → direct (no OTP)
        const res = await staffLogin({ method: "phone", value: phone });
        if (res.status === "not_found" || res.status === "error") {
          setError(res.message || "Account not found. Please register first.");
          return;
        }
        if (res.status === "not_verified") {
          setError(res.message || "Please login with email OTP first to verify your account.");
          return;
        }
        // Direct session — no OTP step
        login({
          staffId: res.staff_id,
          name: res.name,
          email: res.email,
          role: res.role,
        });
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await staffVerifyOtp({ email: pendingEmail, otp });
      if (res.status === "error") { setError(res.message); return; }
      login({
        staffId: res.staff_id,
        name: res.name,
        email: res.email,
        role: res.role,
      });
    } catch (err: any) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Helper: which email value to submit for OTP verification
  const activeEmail = tab === "register" ? email : pendingEmail;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-sidebar-primary flex items-center justify-center shadow-lg">
            <UtensilsCrossed className="h-7 w-7 text-sidebar-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">DineIQ Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Staff Dashboard</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Login / Register tabs */}
          {step === "credentials" && (
            <div className="flex border-b border-border">
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTabSwitch(t)}
                  className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                    tab === t
                      ? "text-foreground border-b-2 border-sidebar-primary bg-card"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="p-6">
            {/* OTP step heading */}
            {step === "otp" && (
              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold text-foreground">
                  {pendingName ? `Welcome, ${pendingName}!` : "Check your inbox"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a 6-digit OTP to <span className="font-medium text-foreground">{activeEmail}</span>.<br />
                  It expires in 5 minutes.
                </p>
              </div>
            )}

            {/* ── CREDENTIALS FORM ── */}
            {step === "credentials" && (
              <form onSubmit={handleCredentialSubmit} className="space-y-4">

                {/* Register-only fields */}
                {tab === "register" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                      <input
                        id="staff-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Phone (optional)</label>
                      <input
                        id="staff-reg-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254 700 000 000"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Role *</label>
                      <select
                        id="staff-role"
                        required
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-primary capitalize"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} className="capitalize">{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Work Email *</label>
                      <input
                        id="staff-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@restaurant.com"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
                      />
                    </div>
                  </>
                )}

                {/* Login method toggle */}
                {tab === "login" && (
                  <>
                    <div className="flex rounded-lg border border-input overflow-hidden">
                      {(["email", "phone"] as LoginMethod[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { setLoginMethod(m); setError(""); }}
                          className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                            loginMethod === m
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {m === "email" ? "Email (OTP)" : "Phone"}
                        </button>
                      ))}
                    </div>

                    {loginMethod === "email" ? (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Work Email *</label>
                        <input
                          id="staff-login-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@restaurant.com"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Phone Number *</label>
                        <input
                          id="staff-login-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+254 700 000 000"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Phone login is available after your first email OTP verification.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  id="staff-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-sidebar-primary text-sidebar-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading
                    ? tab === "login" && loginMethod === "phone"
                      ? "Logging in…"
                      : "Sending OTP…"
                    : tab === "register"
                    ? "Register & Get OTP"
                    : loginMethod === "phone"
                    ? "Login with Phone"
                    : "Login with OTP"}
                </button>
              </form>
            )}

            {/* ── OTP FORM ── */}
            {step === "otp" && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Enter OTP</label>
                  <input
                    id="staff-otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="______"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-center tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-primary text-lg font-bold"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  id="staff-verify-btn"
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-sidebar-primary text-sidebar-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify & Enter Dashboard"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition py-1"
                >
                  ← Back
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
