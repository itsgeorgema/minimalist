"use client";
/* eslint-disable @next/next/no-img-element -- parity with static site; optimize later */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

export default function HomePage() {
  const [year, setYear] = useState<number | null>(null);

  // Refs for DOM elements
  const mainImageSectionRef = useRef<HTMLDivElement>(null);
  const mainImageTrackRef   = useRef<HTMLDivElement>(null);
  const mainImageRef        = useRef<HTMLDivElement>(null);
  const mainImageTextRef    = useRef<HTMLDivElement>(null);

  // Refs for projects horizontal scroll
  const projectsTrackRef  = useRef<HTMLDivElement>(null);
  const projectsRunnerRef = useRef<HTMLDivElement>(null);

  // Locomotive Scroll instance — shared with smoothScrollTo
  const locomotiveRef = useRef<any>(null);

  // Scroll targets exposed to nav handlers
  const aboutScrollTargetRef    = useRef<number>(0);
  const projectsScrollTargetRef = useRef<number>(0);

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

  const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    smoothScrollTo(aboutScrollTargetRef.current);
  };

  const handleProjectsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    smoothScrollTo(projectsScrollTargetRef.current);
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
    const imgWrap    = mainImageRef.current;
    const textPanel  = mainImageTextRef.current;
    const trackEl    = mainImageTrackRef.current;
    const runner     = projectsRunnerRef.current;
    const projTrack  = projectsTrackRef.current;
    if (!imgWrap || !textPanel || !trackEl || !runner || !projTrack) return;

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

    // ── Image GSAP timeline ────────────────────────────────────────────────
    const tl = gsap.timeline({ paused: true });

    gsap.set(imgWrap,   { width: "100%", marginLeft: "0%" });
    gsap.set(textPanel, { opacity: 0, x: 0, visibility: "hidden" });

    const resumeEntries = Array.from(
      textPanel.querySelectorAll<HTMLElement>(".resume-entry")
    );
    if (resumeEntries.length) gsap.set(resumeEntries, { opacity: 0, y: 14 });

    tl.to(imgWrap, { width: "48%", ease: "power2.inOut", duration: 1.0 }, 0);

    tl.fromTo(
      textPanel,
      { opacity: 0, x: 50, visibility: "hidden" },
      { opacity: 1, x: 0,  visibility: "visible", ease: "power3.out", duration: 0.40 },
      0.95
    );
    resumeEntries.forEach((entry, i) => {
      tl.fromTo(
        entry,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0,  ease: "power2.out", duration: 0.90 },
        1.15 + i * 0.30
      );
    });

    // ── Projects GSAP timeline ─────────────────────────────────────────────
    const projTl = gsap.timeline({ paused: true });
    gsap.set(runner, { x: 0 });

    // ── Track bounds ───────────────────────────────────────────────────────
    let trackDocTop     = 0;
    let trackScrollDist = 1;
    let projTrackDocTop = 0;
    let projScrollDist  = 1;

    const computeBounds = () => {
      const rect      = trackEl.getBoundingClientRect();
      trackDocTop     = rect.top + window.scrollY;
      trackScrollDist = Math.max(1, trackEl.offsetHeight - window.innerHeight);

      gsap.set(runner, { x: 0 });
      const wordEl    = runner.querySelector<HTMLElement>(".projects-word");
      const charCount = wordEl?.textContent?.trim().length || 1;
      const charWidth = runner.scrollWidth / charCount;
      const scrollBudget = Math.max(0, runner.scrollWidth - window.innerWidth + charWidth * 0.3);
      projTrack.style.height = `${window.innerHeight + scrollBudget}px`;

      const prect     = projTrack.getBoundingClientRect();
      projTrackDocTop = prect.top + window.scrollY;
      projScrollDist  = Math.max(1, scrollBudget);

      // Expose snap targets to nav handlers
      aboutScrollTargetRef.current    = trackDocTop + trackScrollDist;
      projectsScrollTargetRef.current = projTrackDocTop;

      projTl.clear();
      projTl.to(runner, { x: -scrollBudget, ease: "none", duration: 1 });
    };

    waitForIntro().then(() => {
      if (!mounted) return;

      computeBounds();
      tl.progress(0);
      projTl.progress(0);


      import("locomotive-scroll").then(({ default: LocomotiveScroll }) => {
        if (!mounted) return;

        locoScroll = new LocomotiveScroll({
          lenisOptions: {
            lerp:            0.07,
            smoothWheel:     true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
          },
          scrollCallback: (args: any) => {
            const scrollY = typeof args.scroll === "number"
              ? args.scroll
              : window.scrollY;

            // Image animation
            const p1 = gsap.utils.clamp(0, 1, (scrollY - trackDocTop) / trackScrollDist);
            tl.progress(p1);

            // Projects horizontal scroll
            const p2 = gsap.utils.clamp(0, 1, (scrollY - projTrackDocTop) / projScrollDist);
            projTl.progress(p2);
          },
        });

        locomotiveRef.current = locoScroll;
        window.addEventListener("resize", computeBounds, { passive: true });
      });
    });

    return () => {
      mounted = false;
      tl.kill();
      projTl.kill();
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
            <a href="#section-background" className="cursor-can-hover" onClick={handleAboutClick}>ABOUT</a>
            <a>&nbsp;&nbsp;</a>
            <a href="#section-projects" className="cursor-can-hover" onClick={handleProjectsClick}>PROJECTS</a>
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
          <section className="page-wrapper layout-0" id="homepage" ref={mainImageSectionRef}>
            <div className="scroll-wrapper">
              <div className="container">

                <h2 className="title">George</h2>

                {/* ── Sticky animation section ─────────────────────────────
                    .animation-scroll-track  is 300vh tall.
                    .animation-sticky-frame  is 100vh sticky at top:0.
                    Locomotive Scroll maps the 200vh scroll budget to the
                    GSAP timeline, so the image animates while this section
                    is pinned in view. ──────────────────────────────────── */}
                <div className="animation-scroll-track" ref={mainImageTrackRef}>
                  {/* Aligns with scroll Y where hero/background scrub reaches p=1 (same as trackScrollDist) */}
                  <span className="hero-scrub-end-anchor" id="section-background" aria-hidden="true" />
                  <div className="animation-sticky-frame">

                    <div className="grid__animation-wrapper" ref={mainImageRef}>
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

                    <div className="main-image-text-panel" ref={mainImageTextRef}>
                      <div className="resume-panel">
                        <div className="resume-panel__header">
                          <span className="resume-panel__label">Background</span>
                        </div>
                        <div className="resume-entries">

                          <div className="resume-entry">
                            <span className="resume-entry__num">01</span>
                            <div className="resume-entry__content">
                              <p className="resume-entry__role">Software Engineer Co-op</p>
                              <p className="resume-entry__meta"><span className="resume-entry__company">IBM</span><span className="resume-entry__period">Feb 2026 — Present</span></p>
                              <p className="resume-entry__tag">Automation and AI: Infrastructure for Project Bob</p>
                            </div>
                          </div>

                          <div className="resume-entry">
                            <span className="resume-entry__num">02</span>
                            <div className="resume-entry__content">
                              <p className="resume-entry__role">Software Engineer Intern</p>
                              <p className="resume-entry__meta"><span className="resume-entry__company">Praxie AI</span><span className="resume-entry__period">Apr 2025 — Feb 2026</span></p>
                              <p className="resume-entry__tag">Mobile and Backend Infrastructure with GCP and React Native</p>
                            </div>
                          </div>

                          <div className="resume-entry">
                            <span className="resume-entry__num">03</span>
                            <div className="resume-entry__content">
                              <p className="resume-entry__role">Lead Full-Stack Engineer</p>
                              <p className="resume-entry__meta"><span className="resume-entry__company">Alpha Kappa Psi @ UCSD</span><span className="resume-entry__period">Dec 2024 — Jan 2026</span></p>
                              <p className="resume-entry__tag">Full-Stack Development with Next.js and Supabase</p>
                            </div>
                          </div>

                          <div className="resume-entry">
                            <span className="resume-entry__num">04</span>
                            <div className="resume-entry__content">
                              <p className="resume-entry__role">B.S. Computer Science</p>
                              <p className="resume-entry__meta"><span className="resume-entry__company">UC San Diego</span><span className="resume-entry__period">Sep 2024 — Present</span></p>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              {/* ── Featured Projects — horizontal scroll ─────────────────────────
                  .projects-scroll-track is 450vh tall.
                  .projects-sticky-frame is 100vh sticky at top:0.
                  The GSAP projTl translates .projects-runner left as scroll
                  progresses, sliding the title off-left and revealing cards. ── */}
              {/* ── Featured / Projects title animation — horizontal scroll ─────────
                  Runner contains two 100vw word panels: "Featured" then "Projects".
                  GSAP translates the runner left by 100vw over the scroll budget,
                  shifting "Featured" off-left and revealing "Projects". ───────── */}
              <div className="projects-scroll-track" ref={projectsTrackRef} id="section-projects">
                <div className="projects-sticky-frame">
                  <div className="projects-runner" ref={projectsRunnerRef}>
                    <div className="projects-word-panel">
                      <span className="projects-word">Projects</span>
                    </div>
                    <div className="projects-runner-slack" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* ── Featured Projects — 4-col sticky grid ────────────────────────────── */}
              {/*  Flat row-major layout: cells are direct grid children so CSS    */}
              {/*  Grid controls all row heights uniformly. Spotify sticks at top. */}
              <div className="exp-sticky-section">

                {/* Grid A — rows 1-2: Pokemon Generator sticks here */}
                <div className="exp-sticky-grid">

                  {/* Row 1 */}
                  <div className="exp-sticky-card exp-sticky-card--blank" />
                  <div className="exp-sticky-card exp-sticky-card--blank" />
                  <div className="exp-sticky-card exp-sticky-card--pinned">
                    <span className="exp-sticky-card__num">01</span>
                    <div className="exp-sticky-card__body">
                      <p className="exp-sticky-card__name">Pokemon Generator</p>
                      <p className="exp-sticky-card__category">Deep Learning</p>
                      <p className="exp-sticky-card__desc">Generates original Pokemon images and stats via a Conditional GAN.</p>
                      <p className="exp-sticky-card__stack">Python · PyTorch · CUDA · Flask · Docker</p>
                      <div className="exp-sticky-card__links">
                        <a href="https://original-pokemon-generator-project.fly.dev/" target="_blank" className="cursor-can-hover">↗ Live</a>
                        <a href="https://github.com/itsgeorgema/Pokemon-Generator" target="_blank" className="cursor-can-hover">GitHub</a>
                        <a href="https://www.youtube.com/watch?v=SFcy8QjVgsY" target="_blank" className="cursor-can-hover">Demo</a>
                      </div>
                    </div>
                  </div>
                  <div className="exp-sticky-card exp-sticky-card--blank" />

                  {/* Row 2 */}
                  <div className="exp-sticky-card">
                    <span className="exp-sticky-card__num">02</span>
                    <div className="exp-sticky-card__body">
                      <p className="exp-sticky-card__name">Spotify Mood Player</p>
                      <p className="exp-sticky-card__category">Full-Stack AI</p>
                      <p className="exp-sticky-card__desc">AI categorizes and plays Spotify songs by mood.</p>
                      <p className="exp-sticky-card__stack">TypeScript · React · Python · Flask · OpenAI · AWS</p>
                      <div className="exp-sticky-card__links">
                        <a href="https://spotify-mood-player.vercel.app/" target="_blank" className="cursor-can-hover">↗ Live</a>
                        <a href="https://github.com/itsgeorgema/spotify-mood-player" target="_blank" className="cursor-can-hover">GitHub</a>
                        <a href="https://www.youtube.com/watch?v=Iloqfjgzkps" target="_blank" className="cursor-can-hover">Demo</a>
                      </div>
                    </div>
                  </div>
                  <div className="exp-sticky-card exp-sticky-card--blank" />
                  <div className="exp-sticky-card exp-sticky-card--blank" />
                  <div className="exp-sticky-card">
                    <span className="exp-sticky-card__num">03</span>
                    <div className="exp-sticky-card__body">
                      <p className="exp-sticky-card__name">Watchdog</p>
                      <p className="exp-sticky-card__category">DevOps · AI</p>
                      <p className="exp-sticky-card__desc">AI-powered CI/CD automation for PR reviews, linting, and security checks.</p>
                      <p className="exp-sticky-card__stack">Python · FastAPI · Node.js · GitHub Actions · OpenAI · AWS</p>
                      <div className="exp-sticky-card__links">
                        <a href="https://github.com/itsgeorgema/watchdog" target="_blank" className="cursor-can-hover">↗ GitHub</a>
                        <a href="https://www.youtube.com/watch?v=SPpE-DwsTb8" target="_blank" className="cursor-can-hover">Demo</a>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Grid B — rows 3-4: AKPsi sticks here, Pokemon Generator has exited */}
                <div className="exp-sticky-grid exp-sticky-grid--no-top-border">

                  {/* Row 3 */}
                  <div className="exp-sticky-card exp-sticky-card--blank" />
                  <div className="exp-sticky-card exp-sticky-card--pinned">
                    <span className="exp-sticky-card__num">04</span>
                    <div className="exp-sticky-card__body">
                      <p className="exp-sticky-card__name">UCSD AKPsi Website</p>
                      <p className="exp-sticky-card__category">Full-Stack</p>
                      <p className="exp-sticky-card__desc">Official chapter website for UCSD Alpha Kappa Psi.</p>
                      <p className="exp-sticky-card__stack">Next.js · React · TypeScript · Supabase</p>
                      <div className="exp-sticky-card__links">
                        <a href="https://akpsiucsd.com/" target="_blank" className="cursor-can-hover">↗ Live</a>
                        <a href="https://github.com/itsgeorgema/ucsd-akpsi-website" target="_blank" className="cursor-can-hover">GitHub</a>
                      </div>
                    </div>
                  </div>
                  <div className="exp-sticky-card">
                    <span className="exp-sticky-card__num">05</span>
                    <div className="exp-sticky-card__body">
                      <p className="exp-sticky-card__name">This Portfolio</p>
                      <p className="exp-sticky-card__category">Portfolio</p>
                      <p className="exp-sticky-card__desc">Built with Next.js, Three.js, Lenis, GSAP, and WebGL.</p>
                      <p className="exp-sticky-card__stack">Next.js · React · Three.js · Lenis · GSAP · WebGL · TypeScript</p>
                      <div className="exp-sticky-card__links">
                        <a href="https://ggeorgema.com/" target="_blank" className="cursor-can-hover">↗ Live</a>
                        <a href="https://github.com/itsgeorgema/minimalist" target="_blank" className="cursor-can-hover">GitHub</a>
                      </div>
                    </div>
                  </div>
                  <div className="exp-sticky-card exp-sticky-card--blank" />

                  {/* Row 4 */}
                  <div className="exp-sticky-card">
                    <span className="exp-sticky-card__num">06</span>
                    <div className="exp-sticky-card__body">
                      <p className="exp-sticky-card__name">Text-Based Adventure</p>
                      <p className="exp-sticky-card__category">CLI Game</p>
                      <p className="exp-sticky-card__desc">Museum heist adventure game inspired by Zork, playable via CLI.</p>
                      <p className="exp-sticky-card__stack">Java</p>
                      <div className="exp-sticky-card__links">
                        <a href="https://github.com/itsgeorgema/text-based-adventure-game" target="_blank" className="cursor-can-hover">↗GitHub</a>
                        <a href="https://www.youtube.com/watch?v=PNoRD2KLa6k" target="_blank" className="cursor-can-hover">Demo</a>
                      </div>
                    </div>
                  </div>
                  <div className="exp-sticky-card exp-sticky-card--blank" />
                  <div className="exp-sticky-card exp-sticky-card--blank" />
                  <div className="exp-sticky-card">
                    <span className="exp-sticky-card__num">07</span>
                    <div className="exp-sticky-card__body">
                      <p className="exp-sticky-card__name">NBA Draft Hub</p>
                      <p className="exp-sticky-card__category">Data Dashboard</p>
                      <p className="exp-sticky-card__desc">Stats and data explorer for the 2025 NBA Draft class.</p>
                      <p className="exp-sticky-card__stack">React · TypeScript · Vite · Tailwind</p>
                      <div className="exp-sticky-card__links">
                        <a href="https://nba-draft-hub-six.vercel.app/" target="_blank" className="cursor-can-hover">↗ Live</a>
                        <a href="https://github.com/itsgeorgema/nba-draft-hub" target="_blank" className="cursor-can-hover">GitHub</a>
                      </div>  
                    </div>
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
