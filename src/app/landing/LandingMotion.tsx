"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export default function LandingMotion(): null {
  useEffect((): (() => void) => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    let lenis: Lenis | null = null;
    const updateLenis = (time: number): void => lenis?.raf(time * 1000);

    media.add("(prefers-reduced-motion: no-preference)", (): (() => void) => {
      lenis = new Lenis({ duration: 0.85, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(updateLenis);
      gsap.ticker.lagSmoothing(0);

      const context = gsap.context((): void => {
        gsap.utils.toArray<HTMLElement>("[data-motion-section]").forEach((section): void => {
          const targets = section.querySelectorAll<HTMLElement>("[data-reveal]");
          if (targets.length > 0) {
            gsap.from(targets, {
              y: 30,
              duration: 0.42,
              stagger: 0.07,
              ease: "power3.out",
              immediateRender: false,
              scrollTrigger: { trigger: section, start: "top 82%", once: true },
            });
          }
        });

        gsap.to("[data-hero-parallax]", {
          yPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: ".landing-hero", start: "top top", end: "bottom top", scrub: 0.5 },
        });

        document.querySelectorAll<HTMLElement>("[data-counter]").forEach((counter): void => {
          const value = Number(counter.dataset.counter);
          if (!Number.isFinite(value)) return;
          const state = { value: 0 };
          gsap.to(state, {
            value,
            duration: 0.8,
            ease: "power3.out",
            snap: { value: 1 },
            onUpdate: (): void => { counter.textContent = `${counter.dataset.prefix ?? ""}${state.value}`; },
            scrollTrigger: { trigger: counter, start: "top 88%", once: true },
          });
        });
      });

      return (): void => context.revert();
    });

    media.add("(prefers-reduced-motion: reduce)", (): void => {
      gsap.set("[data-reveal], [data-hero-parallax]", { clearProps: "all" });
    });

    return (): void => {
      media.revert();
      gsap.ticker.remove(updateLenis);
      lenis?.destroy();
      ScrollTrigger.getAll().forEach((trigger): void => trigger.kill());
    };
  }, []);

  return null;
}
