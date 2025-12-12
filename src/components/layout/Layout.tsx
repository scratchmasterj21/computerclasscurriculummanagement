import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <Header />
      <main className="container mx-auto px-4 py-6">{children}</main>
      <Toaster />
    </div>
  );
}

