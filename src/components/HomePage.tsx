"use client";
/* eslint-disable @next/next/no-img-element -- parity with static site; optimize later */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

export default function HomePage() {
  const [year, setYear] = useState<number | null>(null);

  // Refs for DOM elements
  const milanSectionRef = useRef<HTMLDivElement>(null);
  const milanTrackRef   = useRef<HTMLDivElement>(null);
  const milanImageRef   = useRef<HTMLDivElement>(null);
  const milanTextRef    = useRef<HTMLDivElement>(null);

  // Locomotive Scroll instance — shared with smoothScrollTo
  const locomotiveRef = useRef<any>(null);

  // ── Smooth scroll helper ─────────────────────────────────────────────────
  // Used by header "Contact" / logo clicks.  Delegates to Locomotive Scroll
  // (→ Lenis) once available, with a GSAP fallback.
  const smoothScrollTo = (targetY: number) => {
    const loco = locomotiveRef.current;
    if (loco) {
      try {
        loco.scrollTo(targetY, { duration: 2.6 });
      } catch {
        window.scrollTo({ top: targetY, behavior: "smooth" });
      }
      return;
    }
    gsap.to(window, {
      duration: 1.6,
      scrollTo: { y: targetY, autoKill: false },
      ease: "power2.inOut",
    });
  };

  // ── Nav click handlers ────────────────────────────────────────────────────
  const handleContactClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    smoothScrollTo(document.documentElement.scrollHeight - window.innerHeight);
  };

  const handleNameClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    smoothScrollTo(0);
  };

  // ── Stable year ───────────────────────────────────────────────────────────
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // ── Scroll reset on (re)load ─────────────────────────────────────────────
  useEffect(() => {
    const reset = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    reset();
    window.addEventListener("load",     reset);
    window.addEventListener("pageshow", reset);
    return () => {
      window.removeEventListener("load",     reset);
      window.removeEventListener("pageshow", reset);
    };
  }, []);

  // ── Intro zoom animation ──────────────────────────────────────────────────
  useEffect(() => {
    const site = document.querySelector<HTMLElement>(".site");
    if (!site) return;

    function applyIntroZoomFit() {
      const el = document.querySelector<HTMLElement>(".site");
      if (!el) return;
      if (!document.body.classList.contains("intro-active")) return;
      if (
        document.body.classList.contains("intro-unveiled") &&
        !document.body.classList.contains("intro-ready")
      ) {
        return;
      }
      const fullH = el.scrollHeight;
      const vh    = window.innerHeight;
      if (!fullH || !vh) return;
      const pad     = 0.9;
      let   scale   = Math.min(1, (vh * pad) / fullH);
      if (scale < 0.08) scale = 0.08;
      const scaledH = fullH * scale;
      const ty      = Math.max(0, (vh - scaledH) / 2);
      el.style.setProperty("--intro-scale",       String(scale));
      el.style.setProperty("--intro-translate-y", `${ty}px`);
    }

    applyIntroZoomFit();
    requestAnimationFrame(() => requestAnimationFrame(applyIntroZoomFit));
    window.addEventListener("load", applyIntroZoomFit);
    const onResize = () => {
      if (document.body.classList.contains("intro-active")) applyIntroZoomFit();
    };
    window.addEventListener("resize", onResize);

    const timeouts: number[] = [];

    function startAnimation() {
      const unveilDelay    = 650;
      const veilDuration   = 950;
      const afterVeil      = unveilDelay + veilDuration + 80;
      const headerSlideMs  = 650;
      const afterHeaderIn  = afterVeil + headerSlideMs;

      timeouts.push(window.setTimeout(() => {
        document.body.classList.add("intro-unveiled");
      }, unveilDelay));

      timeouts.push(window.setTimeout(() => {
        document.body.classList.add("intro-header-in");
      }, afterVeil));

      timeouts.push(window.setTimeout(() => {
        document.body.classList.add("intro-ready");
      }, afterHeaderIn));

      timeouts.push(window.setTimeout(() => {
        document.body.classList.remove("intro-active");
        document.body.classList.remove("intro-header-in");
        document.body.classList.remove("intro-ready");
        document.body.style.overflow = "";
        if (!site) return;
        site.style.removeProperty("--intro-scale");
        site.style.removeProperty("--intro-translate-y");
      }, afterHeaderIn + 1400));
    }

    const heroImg      = document.querySelector<HTMLImageElement>(".hero-featured-img");
    const readyPromise = heroImg
      ? heroImg.decode().catch(() => Promise.resolve())
      : Promise.resolve();

    readyPromise.then(() => requestAnimationFrame(startAnimation));

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener("load",   applyIntroZoomFit);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* -------------------------------------------------------------------------
     Hero image scroll animation — Locomotive Scroll + CSS sticky + GSAP

     Layout contract (set in minimalist.css):
       .animation-scroll-track  →  height: 300vh   (the "scroll budget")
       .animation-sticky-frame  →  position: sticky; top: 0; height: 100vh

     Sticking distance = trackHeight − stickyFrameHeight = 200vh.
     Locomotive Scroll's scrollCallback maps that 200vh of scroll to
     GSAP timeline progress 0 → 1, giving a scrubbed, physics-smooth animation.

     Timeline (progress 0 → 1):
       0 → 0.5   width compression + centring  (power2.in)
       0.5 → 1   slide to left edge            (expo.out)
       0.6+       text panel fades in           (power3.out)
  ------------------------------------------------------------------------- */
  useEffect(() => {
    const imgWrap   = milanImageRef.current;
    const textPanel = milanTextRef.current;
    const trackEl   = milanTrackRef.current;
    if (!imgWrap || !textPanel || !trackEl) return;

    let mounted    = true;
    let locoScroll: any = null;

    // Resolve when the intro animation has completed
    const waitForIntro = () =>
      new Promise<void>((resolve) => {
        const check = () =>
          document.body.classList.contains("intro-active")
            ? requestAnimationFrame(check)
            : resolve();
        check();
      });

    // ── GSAP timeline ──────────────────────────────────────────────────────
    const tl = gsap.timeline({ paused: true });

    gsap.set(imgWrap,   { width: "100%", marginLeft: "0%" });
    gsap.set(textPanel, { opacity: 0, x: 0, visibility: "hidden" });

    // Width compresses then image slides to the left
    tl.to(imgWrap, { width: "48%", ease: "power2.in", duration: 0.7 }, 0);
    tl.to(imgWrap, {
      keyframes: [
        { marginLeft: "26%", duration: 0.7, ease: "power2.in" }, // compress → centre
        { marginLeft: "0%",  duration: 0.9, ease: "power3.out" }, // slide to left edge
      ],
    }, 0);
    // Text panel drifts in during the slide phase
    tl.fromTo(
      textPanel,
      { opacity: 0, x: 80, visibility: "hidden" },
      { opacity: 1, x: 0,  visibility: "visible", ease: "power3.out", duration: 0.35 },
      0.6
    );
    tl.to({}, { duration: 0.05 });

    // ── Track bounds ───────────────────────────────────────────────────────
    // trackDocTop    = document Y where the sticky section starts
    // trackScrollDist = how many pixels of scroll covers progress 0 → 1
    //                  = trackHeight (300vh) − stickyHeight (100vh) = 200vh
    let trackDocTop     = 0;
    let trackScrollDist = 1;

    const computeBounds = () => {
      const rect      = trackEl.getBoundingClientRect();
      trackDocTop     = rect.top + window.scrollY;
      trackScrollDist = Math.max(1, trackEl.offsetHeight - window.innerHeight);
    };

    waitForIntro().then(() => {
      if (!mounted) return;

      computeBounds();
      tl.progress(0);

      // Dynamic import keeps this library out of the SSR bundle
      import("locomotive-scroll").then(({ default: LocomotiveScroll }) => {
        if (!mounted) return;

        locoScroll = new LocomotiveScroll({
          // ── Lenis smooth-scroll options ──────────────────────────────────
          lenisOptions: {
            lerp:            0.07,   // interpolation factor — lower = silkier
            smoothWheel:     true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
          },
          // ── Drive the GSAP timeline from scroll position ─────────────────
          // `args.scroll` is the Lenis scroll Y (a plain number).
          scrollCallback: (args: any) => {
            const scrollY = typeof args.scroll === "number"
              ? args.scroll
              : window.scrollY;
            const p = gsap.utils.clamp(
              0, 1,
              (scrollY - trackDocTop) / trackScrollDist,
            );
            tl.progress(p);
          },
        });

        locomotiveRef.current = locoScroll;

        // Recompute bounds on resize so the progress mapping stays accurate
        window.addEventListener("resize", computeBounds, { passive: true });
      });
    });

    return () => {
      mounted = false;
      tl.kill();
      locoScroll?.destroy();
      locomotiveRef.current = null;
      window.removeEventListener("resize", computeBounds);
    };
  }, []);

  // ── Live clock (SF time) ──────────────────────────────────────────────────
  useEffect(() => {
    const timeEl = document.querySelector(".time");
    if (!timeEl) return;

    function updateTime() {
      if (!timeEl) return;
      timeEl.textContent = new Date().toLocaleTimeString("en-US", {
        timeZone: "America/Los_Angeles",
        hour:     "2-digit",
        minute:   "2-digit",
        hour12:   false,
      });
    }
    updateTime();
    const id = window.setInterval(updateTime, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="site">

        <header id="site-header">
          <div className="site-header__left">
            <h2 className="logo">
              <a href="#site-header" className="cursor-can-hover" onClick={handleNameClick}>
                George Ma
              </a>
            </h2>
          </div>
          <nav className="header-nav site-header__center" aria-label="Primary">
            <a href="#" className="cursor-can-hover">ABOUT</a>
            <a>&nbsp;&nbsp;</a>
            <a href="#" className="cursor-can-hover">PROJECTS</a>
            <a>&nbsp;&nbsp;</a>
            <a href="https://github.com/itsgeorgema" target="_blank" className="cursor-can-hover">GITHUB</a>
            <a>&nbsp;&nbsp;</a>
            <a href="https://www.linkedin.com/in/ggeorgema/" className="cursor-can-hover" target="_blank">LINKEDIN</a>
            <a>&nbsp;&nbsp;</a>
            <a href="#site-footer" className="cursor-can-hover" onClick={handleContactClick}>CONTACT</a>
          </nav>
          <div className="site-header__right">
            <div className="header-info">
              <span className="location">san diego, ca</span>&nbsp;
              <span className="time">—:—</span>
              <span className="menu-dot-container" aria-hidden="true">
                <svg className="menu-dot" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="4" />
                </svg>
              </span>
            </div>
          </div>
        </header>

        <main id="content">
          <section className="page-wrapper layout-0" id="homepage" ref={milanSectionRef}>
            <div className="scroll-wrapper">
              <div className="container">

                <h2 className="title">George</h2>
                <p className="credit-link">Photographed in Milan, Italy</p>

                {/* ── Sticky animation section ─────────────────────────────
                    .animation-scroll-track  is 300vh tall.
                    .animation-sticky-frame  is 100vh sticky at top:0.
                    Locomotive Scroll maps the 200vh scroll budget to the
                    GSAP timeline, so the image animates while this section
                    is pinned in view. ──────────────────────────────────── */}
                <div className="animation-scroll-track" ref={milanTrackRef}>
                  <div className="animation-sticky-frame">

                    <div className="grid__animation-wrapper" ref={milanImageRef}>
                      <div className="grid grid--layout-0" data-name="Compartment Chair">
                        <a
                          href="#"
                          className="grid__item grid__item--featured cursor-can-hover"
                          aria-label="Compartment Chair"
                        >
                          <div className="grid__item-image">
                            <div
                              className="responsive-image hero-featured-image"
                              style={{ paddingTop: "125%" }}
                            >
                              <span className="hero-image-base" aria-hidden="true" />
                              <img
                                className="hero-featured-img"
                                src="/assets/milan.png"
                                alt="Featured"
                                width={1600}
                                height={2000}
                                loading="eager"
                                fetchPriority="high"
                              />
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>

                    <div className="milan-text-panel" ref={milanTextRef}>
                      {/* Placeholder — add your text content here */}
                    </div>

                  </div>
                </div>

                <h2 className="title title--bottom">George</h2>
              </div>

              <footer id="site-footer">
                <div className="site-footer__grid">
                  <div className="site-footer__left">
                    <span className="footer-dot" aria-hidden="true" />
                    <h3>building software</h3>
                  </div>
                  <div className="site-footer__details">
                    <span className="footer-dot" aria-hidden="true" />
                    <div className="site-footer__details-content">
                      <h3>San Diego, CA</h3>
                      <h3 className="geo-tag" aria-label="Coordinates 32.8812 degrees north, 117.2344 degrees west">
                        <span>32.8812° N</span>
                        <span aria-hidden="true">/</span>
                        <span>117.2344° W</span>
                      </h3>
                    </div>
                  </div>
                  <div className="site-footer__links">
                    <a href="https://www.linkedin.com/in/ggeorgema/" target="_blank" className="cursor-can-hover">linkedin</a>
                    <a href="mailto:georgema2020@gmail.com" className="cursor-can-hover">email</a>
                    <a href="tel:+16615133350" className="cursor-can-hover">phone</a>
                  </div>
                  <div className="site-footer__copyright">
                    <h3>George Ma</h3>
                    <h3>© <span id="current-year">{year ?? "—"}</span></h3>
                  </div>
                </div>
              </footer>
            </div>
          </section>
        </main>

      </div>

      <aside className="intro-side-brand" aria-hidden="true">
        <span>MA</span>
        <span>UCSD</span>
        <span>MA</span>
        <span>UCSD</span>
      </aside>
      <p className="label-global">
        George Ma is a software engineer and student at UC San Diego passionate about infrastructure.
      </p>
    </>
  );
}
