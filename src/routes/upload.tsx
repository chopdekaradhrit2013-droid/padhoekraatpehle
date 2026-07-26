import { createFileRoute, redirect } from "@tanstack/react-router";

// Upload now lives as a dialog on /notes — keep this route so old links don't 404
export const Route = createFileRoute("/upload")({
  beforeLoad: () => {
    throw redirect({ to: "/notes" });
  },
});
