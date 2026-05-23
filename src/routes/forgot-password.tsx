import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPage });

function ForgotPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("OTP sent! Check your email.");
    setStage("otp");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Verified! Set a new password.");
    navigate({ to: "/reset-password" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Forgot password?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll email you a one-time code to reset your password.
          </p>

          {stage === "email" ? (
            <form onSubmit={sendOtp} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send OTP to email"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="code">6-digit code</Label>
                <Input id="code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} />
                <p className="mt-1 text-xs text-muted-foreground">Sent to {email}</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify code"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStage("email")}>
                Use a different email
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}