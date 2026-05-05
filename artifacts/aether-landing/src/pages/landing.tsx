import React from "react";
import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { Interface } from "@/components/sections/interface";
import { Gallery } from "@/components/sections/gallery";
import { CTA } from "@/components/sections/cta";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Navigation />
      
      <main>
        <Hero />
        <Features />
        <Interface />
        <Gallery />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
