"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import anime from "animejs";

const OrbitalNode3D = dynamic(() => import("@/components/orbital-node-3d"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" />,
});

export default function LandingPage() {
  const diagnosticsRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // 1. Hero Stagger Reveal
    anime({
      targets: ".stagger-text",
      translateY: [40, 0],
      opacity: [0, 1],
      easing: "easeOutExpo",
      duration: 1500,
      delay: anime.stagger(80, { start: 300 }),
    });

    anime({
      targets: ".fade-in-ui",
      opacity: [0, 1],
      easing: "linear",
      duration: 1000,
      delay: 1500,
    });

    // 2. Continuous Scroll Indicator Bounce
    anime({
      targets: ".scroll-indicator",
      translateY: [0, 10],
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
      duration: 800,
    });

    // 3. Intersection Observer for Scroll Animation
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          // Fire Anime.js timeline when scrolled into view
          anime({
            targets: ".diagnostic-card",
            translateY: [100, 0],
            opacity: [0, 1],
            easing: "easeOutElastic(1, .8)",
            duration: 1200,
            delay: anime.stagger(150),
          });
        }
      },
      { threshold: 0.2 } // Triggers when 20% of the section is visible
    );

    const node = diagnosticsRef.current;
    if (node) {
      observer.observe(node);
    }

    return () => {
      if (node) observer.unobserve(node);
      anime.remove(".stagger-text");
      anime.remove(".fade-in-ui");
      anime.remove(".scroll-indicator");
      anime.remove(".diagnostic-card");
    };
  }, []);

  return (
    <main className="w-full overflow-x-hidden bg-black text-white selection:bg-white selection:text-black">
      
      {/* SECTION 1: HERO */}
      <section className="relative flex items-center justify-center h-screen w-full overflow-hidden">
        {/* 3D WebGL Orbital Node Hero Background */}
        <OrbitalNode3D />
        <div className="pointer-events-none absolute inset-0 z-10 bg-black/40 backdrop-blur-[1px]"></div>

        {/* HUD Elements */}
        <div className="fade-in-ui absolute top-8 left-8 flex items-center gap-2 z-20 font-mono text-[10px] tracking-[0.3em] text-white/50 uppercase opacity-0">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></div>
          SYS.ON // GLOBAL MONITOR
        </div>
        <div className="fade-in-ui absolute top-8 right-8 z-20 font-mono text-[10px] tracking-[0.3em] text-right text-white/50 uppercase opacity-0">
          UPLINK: SECURE
        </div>

        <div className="relative z-20 flex flex-col items-center text-center px-4 mt-[-5vh]">
          <h1 className="text-4xl sm:text-6xl md:text-[8rem] leading-none font-black tracking-tighter uppercase mb-6 flex overflow-hidden">
            {"MODERN SKYWATCH".split("").map((char, index) => (
              <span key={index} className={`stagger-text inline-block opacity-0 ${char === " " ? "w-4 md:w-8" : ""}`}>
                {char}
              </span>
            ))}
          </h1>
          <p className="fade-in-ui opacity-0 font-mono text-sky-400 text-xs md:text-sm mb-12 tracking-[0.4em] uppercase">
            Orbital Intelligence
          </p>
          <Link href="/dashboard" className="fade-in-ui opacity-0 group relative inline-flex items-center justify-center px-8 py-4 font-mono text-xs tracking-[0.2em] border border-white/20 hover:border-sky-400 hover:bg-sky-400/10 transition-all duration-300 backdrop-blur-md">
            <span>[ INITIATE COMMAND CENTER ]</span>
          </Link>
        </div>

        {/* Scroll Indicator */}
        <div className="fade-in-ui scroll-indicator absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-0">
          <span className="font-mono text-[9px] tracking-[0.3em] text-white/40 uppercase">Scroll to Access</span>
          <div className="w-[1px] h-8 bg-gradient-to-b from-white/40 to-transparent"></div>
        </div>
      </section>

      {/* SECTION 2: SCROLL TRIGGERED DIAGNOSTICS */}
      <section ref={diagnosticsRef} className="relative z-30 min-h-screen bg-[#050505] flex flex-col justify-center items-center px-8 py-24 border-t border-white/5">
        <div className="w-full max-w-6xl">
          <h2 className="diagnostic-card opacity-0 font-mono text-sm tracking-[0.4em] text-sky-400 mb-12 border-b border-white/10 pb-4">
            {"// ACTIVE TELEMETRY STREAMS"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <Link
              href="/dashboard?system=eonet"
              className="diagnostic-card opacity-0 block group cursor-pointer bg-white/5 border border-white/10 p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
            >
              <h3 className="font-bold text-2xl tracking-tighter mb-4">NASA EONET</h3>
              <p className="font-mono text-xs text-white/50 leading-relaxed mb-6">Real-time planetary event tracking. Wildfires, severe storms, and volcanic activity.</p>
              <div className="w-full h-1 bg-white/10 relative overflow-hidden mb-3">
                <div className="absolute top-0 left-0 h-full w-2/3 bg-sky-400"></div>
              </div>
              <div className="flex justify-end">
                <span className="text-white/30 text-xs font-mono transition-transform duration-300 group-hover:translate-x-2 group-hover:text-white inline-block">
                  [ -&gt; ]
                </span>
              </div>
            </Link>

            {/* Card 2 */}
            <Link
              href="/dashboard?system=donki"
              className="diagnostic-card opacity-0 block group cursor-pointer bg-white/5 border border-white/10 p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
            >
              <h3 className="font-bold text-2xl tracking-tighter mb-4">DONKI API</h3>
              <p className="font-mono text-xs text-white/50 leading-relaxed mb-6">Space weather operations. Monitoring solar flares and geomagnetic disturbances.</p>
              <div className="w-full h-1 bg-white/10 relative overflow-hidden mb-3">
                <div className="absolute top-0 left-0 h-full w-1/2 bg-violet-400"></div>
              </div>
              <div className="flex justify-end">
                <span className="text-white/30 text-xs font-mono transition-transform duration-300 group-hover:translate-x-2 group-hover:text-white inline-block">
                  [ -&gt; ]
                </span>
              </div>
            </Link>

            {/* Card 3 */}
            <Link
              href="/dashboard"
              className="diagnostic-card opacity-0 block group cursor-pointer bg-white/5 border border-white/10 p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
            >
              <h3 className="font-bold text-2xl tracking-tighter mb-4">GLOBAL MAP</h3>
              <p className="font-mono text-xs text-white/50 leading-relaxed mb-6">High-contrast brutalist cartography rendering real-time coordinate data.</p>
              <div className="w-full h-1 bg-white/10 relative overflow-hidden mb-3">
                <div className="absolute top-0 left-0 h-full w-full bg-white/40"></div>
              </div>
              <div className="flex justify-end">
                <span className="text-white/30 text-xs font-mono transition-transform duration-300 group-hover:translate-x-2 group-hover:text-white inline-block">
                  [ -&gt; ]
                </span>
              </div>
            </Link>

          </div>
        </div>
      </section>
    </main>
  );
}
