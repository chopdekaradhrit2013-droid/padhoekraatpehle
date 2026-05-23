import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/notes" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <section className="text-center">
          <span className="inline-block rounded-full bg-accent px-4 py-1 text-sm font-medium text-accent-foreground">
            For the night-before-the-exam squad
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-7xl">
            Padho<span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">Ek</span>RaatPehle
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A shared stash of notes, PDFs and photos. Upload what you have, grab what you need —
            so the whole group can cram smarter, one night at a time.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Get started — it's free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: Upload, title: "Upload anything", text: "PDFs, photos, scans, screenshots — drop it in." },
            { icon: Users, title: "Friends only", text: "Sign in required. Notes are visible only to logged-in users." },
            { icon: BookOpen, title: "Credit where due", text: "Every upload shows the username of whoever shared it." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
