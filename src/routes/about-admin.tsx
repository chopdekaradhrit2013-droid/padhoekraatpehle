import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Mail, Crown, Sparkles } from "lucide-react";

export const Route = createFileRoute("/about-admin")({ component: AboutAdmin });

function AboutAdmin() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-fuchsia-500/10 p-8 shadow-lg">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative flex flex-col items-center text-center">
            <div className="relative">
              <Avatar className="h-28 w-28 ring-4 ring-primary/40">
                <AvatarFallback className="bg-gradient-to-br from-primary to-fuchsia-500 text-3xl text-white">
                  AC
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-yellow-900 shadow-lg ring-2 ring-background">
                <Crown className="h-4 w-4" />
              </div>
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight">Adhrit Chopdekar</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Badge variant="destructive" className="gap-1">
                <ShieldCheck className="h-3 w-3" /> ADMIN
              </Badge>
              <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                <Sparkles className="h-3 w-3" /> Founder
              </Badge>
            </div>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Creator of <span className="font-semibold text-foreground">PadhoEkRaatPehle</span> — a place
              for friends to share notes the night before exams, because we&apos;ve all been there.
            </p>

            <div className="mt-6 flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-sm">
              <Mail className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">chopdekaradhrit2013@gmail.com</span>
            </div>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Role", value: "Administrator" },
              { label: "Powers", value: "Ban · Delete · Announce" },
              { label: "Mission", value: "Help friends study" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-background/60 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-sm font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}