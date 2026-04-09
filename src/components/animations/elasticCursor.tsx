"use client";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { useMouse } from "@/hooks/useMouse";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isTouchOrCoarse } from "@/components/util";

// Gsap Ticker Function
function useTicker(callback: any, paused: boolean) {
  useEffect(() => {
    if (!paused && callback) {
      gsap.ticker.add(callback);
    }
    return () => {
      gsap.ticker.remove(callback);
    };
  }, [callback, paused]);
}

const EMPTY = {} as {
  x: Function;
  y: Function;
  r?: Function;
  width?: Function;
  rt?: Function;
  sx?: Function;
  sy?: Function;
};
function useInstance(value = {}) {
  const ref = useRef(EMPTY);
  if (ref.current === EMPTY) {
    ref.current = typeof value === "function" ? value() : value;
  }
  return ref.current;
}

// Function for Mouse Move Scale Change
function getScale(diffX: number, diffY: number) {
  const distance = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
  return Math.min(distance / 735, 0.35);
}

// Function For Mouse Movement Angle in Degrees
function getAngle(diffX: number, diffY: number) {
  return (Math.atan2(diffY, diffX) * 180) / Math.PI;
}

function getRekt(el: HTMLElement) {
  // Add null checks for classList
  if (el?.classList?.contains("cursor-can-hover"))
    return el.getBoundingClientRect();
  else if (el.parentElement?.classList?.contains("cursor-can-hover"))
    return el.parentElement.getBoundingClientRect();
  else if (
    el.parentElement?.parentElement?.classList?.contains("cursor-can-hover")
  )
    return el.parentElement.parentElement.getBoundingClientRect();
  return null;
}

const CURSOR_DIAMETER = 50;

function ElasticCursor() {
  const isLoading = false; // Simplified since we removed the preloader context
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(isTouchOrCoarse());
  }, []);

  // React Refs for Jelly Blob and Text
  const jellyRef = useRef<HTMLDivElement>(null);
  const lastHoveredElement = useRef<Element | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const isHoveringRef = useRef(false); // Ref to track hovering state immediately
  const lastPointerRef = useRef<{ x: number; y: number; hasMoved: boolean }>({
    x: 0,
    y: 0,
    hasMoved: false,
  });
  const { x, y } = useMouse();

  // Save pos and velocity Objects
  const pos = useInstance(() => ({ x: 0, y: 0 }));
  const vel = useInstance(() => ({ x: 0, y: 0 }));
  const set = useInstance();

  // Set GSAP quick setter Values on useLayoutEffect Update
  useLayoutEffect(() => {
    if (isTouch) return;
    // Ensure cursor is centered on pointer/target regardless of CSS transforms.
    // This fixes cases where the Tailwind translate(-50%, -50%) isn't preserved in GSAP's transform parsing.
    gsap.set(jellyRef.current, { xPercent: -50, yPercent: -50 });
    set.x = gsap.quickSetter(jellyRef.current, "x", "px");
    set.y = gsap.quickSetter(jellyRef.current, "y", "px");
    set.r = gsap.quickSetter(jellyRef.current, "rotate", "deg");
    set.sx = gsap.quickSetter(jellyRef.current, "scaleX");
    set.sy = gsap.quickSetter(jellyRef.current, "scaleY");
    set.width = gsap.quickSetter(jellyRef.current, "width", "px");
  }, []);

  // Start Animation loop
  const loop = useCallback(() => {
    if (!set.width || !set.sx || !set.sy || !set.r) return;
    // Calculate angle and scale based on velocity
    var rotation = getAngle(+vel.x, +vel.y); // Mouse Move Angle
    var scale = getScale(+vel.x, +vel.y); // Blob Squeeze Amount

    // Set GSAP quick setter Values on Loop Function
    // Use isHoveringRef for immediate check to prevent race conditions
    if (!isHoveringRef.current && !isLoading) {
      set.x(pos.x);
      set.y(pos.y);
      set.width(50 + scale * 300);
      set.r(rotation);
      set.sx(1 + scale);
      set.sy(1 - scale * 2);
    } else {
      set.r(0);
      // Explicitly reset scale when hovering to prevent "compressed" look
      set.sx(1);
      set.sy(1);
    }
  }, [isLoading]); // Removed isHovering dependency, relying on ref + ticker

  const [cursorMoved, setCursorMoved] = useState(false);
  // Run on Mouse Move
  useLayoutEffect(() => {
    if (isMobile || isTouch) return;
    // Caluclate Everything Function
    const resolveHoverTarget = (el: HTMLElement | null): HTMLElement | null => {
      if (!el) return null;
      if (el?.classList?.contains("cursor-can-hover")) return el;
      if (el?.parentElement?.classList?.contains("cursor-can-hover"))
        return el.parentElement;
      if (el?.parentElement?.parentElement?.classList?.contains("cursor-can-hover"))
        return el.parentElement.parentElement;
      return null;
    };

    const detach = (pointerX: number, pointerY: number) => {
      if (!jellyRef.current) return;
      if (isHoveringRef.current || lastHoveredElement.current) {
        setIsHovering(false);
        isHoveringRef.current = false;
        lastHoveredElement.current = null;

        gsap.killTweensOf(jellyRef.current);
        gsap.to(jellyRef.current, {
          borderRadius: 50,
          width: CURSOR_DIAMETER,
          height: CURSOR_DIAMETER,
          x: pointerX,
          y: pointerY,
          duration: 0.3,
          ease: "power3.out",
        });
      }
    };

    const attach = (hoverTarget: HTMLElement, pointerX: number, pointerY: number) => {
      if (!jellyRef.current) return;
      const hoverElemRect = hoverTarget.getBoundingClientRect();

      // Only trigger the "snap and expand" animation if we just entered this element
      if (lastHoveredElement.current !== hoverTarget) {
        setIsHovering(true);
        isHoveringRef.current = true;
        lastHoveredElement.current = hoverTarget;

        gsap.killTweensOf(jellyRef.current);

        // Reset to small cursor shape at current mouse position
        gsap.set(jellyRef.current, {
          x: pointerX,
          y: pointerY,
          width: CURSOR_DIAMETER,
          height: CURSOR_DIAMETER,
          borderRadius: 50, // Start as circle
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        });

        // Calculate target dimensions with a minimum size to ensure it "expands" slightly on small elements
        // CURSOR_DIAMETER is 50. using 60 ensures a slight expansion from default state.
        const minDimension = 60;
        const targetWidth = Math.max(hoverElemRect.width + 20, minDimension);
        const targetHeight = Math.max(hoverElemRect.height + 20, minDimension);

        // Animate to target shape and position
        gsap.to(jellyRef.current, {
          width: targetWidth,
          height: targetHeight,
          x: hoverElemRect.left + hoverElemRect.width / 2,
          y: hoverElemRect.top + hoverElemRect.height / 2,
          duration: 1.5,
          ease: "elastic.out(1, 0.3)",
        });

        // Separate animation for border radius to prevent overshoot below 0 (which causes sharp corners)
        gsap.to(jellyRef.current, {
          borderRadius: 100000,
          duration: 1.0,
          ease: "power2.out",
        });
      } else {
        // If still on the same element (e.g. scroll without moving), keep it centered on the element.
        gsap.to(jellyRef.current, {
          x: hoverElemRect.left + hoverElemRect.width / 2,
          y: hoverElemRect.top + hoverElemRect.height / 2,
          duration: 0.2,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
    };

    const evaluateHoverAtPoint = (pointerX: number, pointerY: number, rawEl: Element | null) => {
      const hoverTarget = resolveHoverTarget(rawEl as HTMLElement | null);
      if (hoverTarget) attach(hoverTarget, pointerX, pointerY);
      else detach(pointerX, pointerY);
    };

    const setFromEvent = (e: MouseEvent) => {
      if (!jellyRef.current) return;
      if (!cursorMoved) {
        setCursorMoved(true);
      }
      lastPointerRef.current = { x: e.clientX, y: e.clientY, hasMoved: true };

      // Evaluate hover based on the actual element under the pointer.
      // (Using elementFromPoint fixes cases where the original hovered element scrolls away
      // without another mousemove happening.)
      const elUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
      evaluateHoverAtPoint(e.clientX, e.clientY, elUnderPointer);

      // Mouse X and Y
      const x = e.clientX;
      const y = e.clientY;

      // Animate Position and calculate Velocity with GSAP
      gsap.to(pos, {
        x: x,
        y: y,
        duration: 1.5,
        ease: "elastic.out(1, 0.5)",
        onUpdate: () => {
          // @ts-ignore
          vel.x = (x - pos.x) * 1.2;
          // @ts-ignore
          vel.y = (y - pos.y) * 1.2;
        },
      });

      loop();
    };

    if (!isLoading) window.addEventListener("mousemove", setFromEvent);

    // When the page scrolls (or viewport changes) without mousemove, the element under the pointer
    // can change; re-evaluate hover/attach state to prevent "stuck" attachment.
    const onScrollOrResize = () => {
      if (!lastPointerRef.current.hasMoved) return;
      const { x, y } = lastPointerRef.current;
      const elUnderPointer = document.elementFromPoint(x, y);
      evaluateHoverAtPoint(x, y, elUnderPointer);
    };
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    return () => {
      if (!isLoading) window.removeEventListener("mousemove", setFromEvent);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isLoading]); // Removed isHovering dependency to prevent re-attaching listener on every hover change. Logic uses refs now.

  useEffect(() => {
    if (!jellyRef.current || isTouch) return;
    // Initialize cursor to proper circular shape
    jellyRef.current.style.height = `${CURSOR_DIAMETER}px`;
    jellyRef.current.style.borderRadius = `${CURSOR_DIAMETER}px`;
    jellyRef.current.style.width = `${CURSOR_DIAMETER}px`;
  }, []);

  useTicker(loop, isLoading || !cursorMoved || isMobile || isTouch);
  if (isMobile || isTouch) return null;
  // Return UI
  return (
    <>
      <div
        ref={jellyRef}
        id={"jelly-id"}
        className={cn(
          `w-[${CURSOR_DIAMETER}px] h-[${CURSOR_DIAMETER}px] border-2 border-black dark:border-white`,
          "jelly-blob fixed left-0 top-0 rounded-lg z-[999] pointer-events-none will-change-transform",
          "translate-x-[-50%] translate-y-[-50%]"
        )}
        style={{
          zIndex: 100,
          backdropFilter: "invert(100%)",
        }}
      ></div>
      <div
        id="cursor-dot"
        className="rounded-full fixed pointer-events-none transition-none duration-300"
        style={{
          top: y,
          left: x,
          width: "14px",
          height: "14px",
          backdropFilter: "invert(100%)",
          transform: "translate(-50%, -50%)",
        }}
      ></div>
    </>
  );
}

export default ElasticCursor;
