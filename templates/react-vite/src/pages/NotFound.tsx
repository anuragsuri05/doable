import { Link, useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-2 text-5xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-muted-foreground">No page at {location.pathname}</p>
        <Link to="/" className="text-primary underline underline-offset-4">Return home</Link>
      </div>
    </main>
  );
}
