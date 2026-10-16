import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">404</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">That page does not exist</h1>
      <p className="mt-3 text-muted">The link may be old or mistyped. These might help.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/">Home</Button>
        <Button href="/agencies" variant="secondary">
          Agency directory
        </Button>
      </div>
    </div>
  );
}
