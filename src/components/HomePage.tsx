"use client";
/* eslint-disable @next/next/no-img-element -- parity with static site; optimize later */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

export default function HomePage() {
  const [year, setYear] = useState<number | null>(null);
  const milanSectionRef = useRef<HTMLDivElement>(null);
  const milanTrackRef = useRef<HTMLDivElement>(null);
  const milanImageRef = useRef<HTMLDivElement>(null);
  const milanTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function scrollTopZero() {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    scrollTopZero();
    window.addEventListener("load", scrollTopZero);
    window.addEventListener("pageshow", scrollTopZero);
    return () => {
      window.removeEventListener("load", scrollTopZero);
      window.removeEventListener("pageshow", scrollTopZero);
    };
  }, []);

  const smoothScrollTo = (targetY: number) => {
    const lenis = (window as any).lenisScroll;
    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(targetY, {
        duration: 1.6,
        // power2.inOut
        easing: (t: number) =>
          t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      });
      return;
    }
    // Fallback for when Lenis isn't available
    gsap.registerPlugin(ScrollToPlugin);
    gsap.killTweensOf(window);
    gsap.to(window, {
      duration: 1.6,
      scrollTo: { y: targetY, autoKill: false },
      ease: "power2.inOut",
    });
  };

  const handleContactClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    smoothScrollTo(maxScroll);
  };

  const handleNameClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    smoothScrollTo(0);
  };

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

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
      const vh = window.innerHeight;
      if (!fullH || !vh) return;
      const pad = 0.9;
      let scale = Math.min(1, (vh * pad) / fullH);
      if (scale < 0.08) scale = 0.08;
      const scaledH = fullH * scale;
      const ty = Math.max(0, (vh - scaledH) / 2);
      el.style.setProperty("--intro-scale", String(scale));
      el.style.setProperty("--intro-translate-y", `${ty}px`);
    }

    applyIntroZoomFit();
    requestAnimationFrame(() => requestAnimationFrame(applyIntroZoomFit));
    window.addEventListener("load", applyIntroZoomFit);
    const onResize = () => {
      if (document.body.classList.contains("intro-active")) applyIntroZoomFit();
    };
    window.addEventListener("resize", onResize);

    /** Browser timer IDs (number); avoids Node `Timeout` vs DOM `number` mismatch. */
    const timeouts: number[] = [];

    function startAnimation() {
      const unveilDelay = 650;
      const veilDuration = 950;
      const afterVeil = unveilDelay + veilDuration + 80;
      const headerSlideMs = 650;
      const afterHeaderIn = afterVeil + headerSlideMs;

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

    // Wait for the hero image to be fully decoded AND painted before starting
    // the animation. img.decode() resolves when the image is decoded and ready
    // to render; the rAF guarantees we're inside a paint frame before we begin.
    const heroImg = document.querySelector<HTMLImageElement>(".hero-featured-img");
    const readyPromise = heroImg
      ? heroImg.decode().catch(() => Promise.resolve())
      : Promise.resolve();

    readyPromise.then(() => {
      requestAnimationFrame(startAnimation);
    });

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener("load", applyIntroZoomFit);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* -----------------------------------------------------------------------
     Three-phase animation:
       "above"  — scroll-driven width compression (scrollY 0 → lockTriggerY)
       "locked" — page scroll frozen, wheel/touch drives slide-left + text
       "below"  — animation complete, free scroll

     Reverse is exactly symmetric: "below" → "locked" at progress 1 → "above".

     marginLeft uses a SINGLE keyframe tween so one tween owns that property
     the whole way — eliminates the reverse-scrub jump caused by overlapping
     tweens fighting over the same property.
     ----------------------------------------------------------------------- */
  useEffect(() => {
    const imgWrap = milanImageRef.current;
    const textPanel = milanTextRef.current;
    const trackEl = milanTrackRef.current;
    if (!imgWrap || !textPanel || !trackEl) return;

    const waitForIntro = () =>
      new Promise<void>((resolve) => {
        const check = () => {
          if (!document.body.classList.contains("intro-active")) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });

    const tl = gsap.timeline({ paused: true });
    const SENSITIVITY = 0.0014;
    const RECT_LOCK_THRESHOLD = -80; // rect.top at which page scroll locks

    // Explicit durations so COMPRESSION_PROGRESS is exact
    const D_COMPRESS = 0.5; // width compression + centre
    const D_SLIDE    = 0.5; // slide to left edge
    // progress = 0.5 is the handoff point between scroll-driven and wheel-driven
    const COMPRESSION_PROGRESS = D_COMPRESS / (D_COMPRESS + D_SLIDE); // 0.5

    gsap.set(imgWrap, { width: "100%", marginLeft: "0%" });
    gsap.set(textPanel, { opacity: 0, x: 0, visibility: "hidden" });

    // Width compression (scroll-driven phase covers this)
    tl.to(imgWrap, { width: "48%", ease: "power2.inOut", duration: D_COMPRESS }, 0);

    // marginLeft as ONE keyframe tween — single ownership means perfect reverse scrub
    tl.to(imgWrap, {
      keyframes: [
        { marginLeft: "26%", duration: D_COMPRESS, ease: "power2.inOut" }, // → centre
        { marginLeft: "0%",  duration: D_SLIDE,    ease: "power2.inOut" }, // → left
      ],
    }, 0);

    // Text reveal (during slide phase)
    tl.fromTo(
      textPanel,
      { opacity: 0, x: 80, visibility: "hidden" },
      { opacity: 1, x: 0, visibility: "visible", ease: "power2.out", duration: 0.35 },
      D_COMPRESS + 0.1
    );
    tl.to({}, { duration: 0.05 });

    // lockTriggerY = window.scrollY when trackEl.getBoundingClientRect().top === RECT_LOCK_THRESHOLD
    let lockTriggerY = 0;
    const computeTrigger = () => {
      const trackDocTop = trackEl.getBoundingClientRect().top + window.scrollY;
      lockTriggerY = trackDocTop - RECT_LOCK_THRESHOLD;
    };

    let phase: "above" | "locked" | "below" = "above";
    let lockedProgress = 0; // kept in sync across all phases
    let touchStartY = 0;
    let lastScrollY = 0;

    const doLock = (progress: number) => {
      if (phase === "locked") return;
      lockedProgress = progress;
      tl.progress(progress);
      document.body.style.position = "fixed";
      document.body.style.top      = `-${lockTriggerY}px`;
      document.body.style.left     = "0";
      document.body.style.right    = "0";
      document.body.style.width    = "100%";
      document.body.style.overflow = "hidden";
      phase = "locked";
    };

    const doUnlock = (direction: -1 | 1, nextPhase: "above" | "below") => {
      if (phase !== "locked") return;
      document.body.style.position = "";
      document.body.style.top      = "";
      document.body.style.left     = "";
      document.body.style.right    = "";
      document.body.style.width    = "";
      document.body.style.overflow = "";
      const target = Math.max(0, lockTriggerY + direction * 2);
      window.scrollTo(0, target);
      lastScrollY = target;
      phase = nextPhase;
    };

    const scrub = (deltaY: number) => {
      if (phase !== "locked") return;
      const next = gsap.utils.clamp(0, 1, lockedProgress + deltaY * SENSITIVITY);
      lockedProgress = next;
      tl.progress(next);
      if (next >= 1 && deltaY > 0) {
        doUnlock(1, "below");               // complete → resume forward scroll
      } else if (next <= COMPRESSION_PROGRESS && deltaY < 0) {
        doUnlock(-1, "above");              // reversed to handoff → scroll-driven takes over
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (phase !== "locked") return;
      e.preventDefault();
      scrub(e.deltaY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (phase !== "locked" || e.touches.length === 0) return;
      touchStartY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (phase !== "locked" || e.touches.length === 0) return;
      e.preventDefault();
      const dy = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;
      scrub(dy);
    };

    const onScroll = () => {
      if (phase === "locked") return;
      const currentScrollY = window.scrollY;
      const scrollingDown  = currentScrollY > lastScrollY;
      lastScrollY = currentScrollY;

      if (phase === "above") {
        // Scroll-driven: map scrollY [0, lockTriggerY] → progress [0, COMPRESSION_PROGRESS]
        const p = lockTriggerY > 0
          ? Math.min(COMPRESSION_PROGRESS, (currentScrollY / lockTriggerY) * COMPRESSION_PROGRESS)
          : COMPRESSION_PROGRESS;
        lockedProgress = p;
        tl.progress(p);

        if (scrollingDown && currentScrollY >= lockTriggerY) {
          doLock(COMPRESSION_PROGRESS); // hand off to wheel-driven
        }
      } else {
        // "below": animation stays at 1; re-lock when crossing trigger going UP
        if (!scrollingDown && currentScrollY <= lockTriggerY) {
          doLock(1);
        }
      }
    };

    let cleanup = () => {};

    waitForIntro().then(() => {
      computeTrigger();
      lastScrollY = window.scrollY;
      tl.progress(0);

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", computeTrigger);
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });

      cleanup = () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", computeTrigger);
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
      };
    });

    return () => {
      cleanup();
      if (phase === "locked") {
        document.body.style.position = "";
        document.body.style.top      = "";
        document.body.style.left     = "";
        document.body.style.right    = "";
        document.body.style.width    = "";
        document.body.style.overflow = "";
      }
      tl.kill();
    };
  }, []);

  useEffect(() => {
    const timeEl = document.querySelector(".time");
    if (!timeEl) return;

    function updateTime() {
      if (!timeEl) return;
      timeEl.textContent = new Date().toLocaleTimeString("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    updateTime();
    const id = window.setInterval(updateTime, 60000);
    return () => clearInterval(id);
  }, []);

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
          <a href="#" className="cursor-can-hover">
            ABOUT
          </a>
          <a>&nbsp;&nbsp;</a>
          <a href="#" className="cursor-can-hover">
            PROJECTS
          </a>
          <a>&nbsp;&nbsp;</a>
          <a href="https://github.com/itsgeorgema" target="_blank" className="cursor-can-hover">
            GITHUB
          </a>
          <a>&nbsp;&nbsp;</a>
          <a
            href="https://www.linkedin.com/in/ggeorgema/"
            className="cursor-can-hover" target="_blank"
          >
            LINKEDIN
          </a>
          <a>&nbsp;&nbsp;</a>
          <a
            href="#site-footer"
            className="cursor-can-hover"
            onClick={handleContactClick}
          >
            CONTACT
          </a>
        </nav>
        <div className="site-header__right">
          <div className="header-info">
            <span className="location">san diego, ca</span>&nbsp;
            <span className="time">—:—</span>
            <span className="menu-dot-container" aria-hidden="true">
              <svg
                className="menu-dot"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
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
              <p className="credit-link">
                Photographed in Milan, Italy
              </p>

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
                  <a href="https://www.linkedin.com/in/ggeorgema/" target="_blank" className="cursor-can-hover">
                    linkedin
                  </a>
                  <a href="mailto:georgema2020@gmail.com" className="cursor-can-hover">
                    email
                  </a>
                  <a href="tel:+16615133350" className="cursor-can-hover">
                    phone
                  </a>
                </div>
                <div className="site-footer__copyright">
                  <h3>George Ma</h3>
                  <h3>
                    © <span id="current-year">{year ?? "—"}</span>
                  </h3>
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
