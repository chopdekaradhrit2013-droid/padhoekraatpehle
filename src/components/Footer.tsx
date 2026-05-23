export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-background/60 py-6 text-center">
      <p className="text-sm text-muted-foreground">
        Built with <span className="text-red-500">♥</span> by{" "}
        <span className="font-semibold text-foreground">Adhrit Chopdekar</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        © {new Date().getFullYear()} PadhoEkRaatPehle. All rights reserved.
      </p>
    </footer>
  );
}