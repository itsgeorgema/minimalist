"use client";
/* eslint-disable @next/next/no-img-element -- parity with static site; optimize later */

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

export default function HomePage() {
  const [year, setYear] = useState<number | null>(null);

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
        <section className="page-wrapper layout-0" id="homepage">
          <div className="scroll-wrapper">
            <div className="container">
              <h2 className="title">George</h2>
              <p className="credit-link">
                Photographed in Milan, Italy
              </p>

              <div className="grid__animation-wrapper">
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
