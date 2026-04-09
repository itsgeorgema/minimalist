"use client";

import React, { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";

interface LenisProps {
  children: React.ReactNode;
  isInsideModal?: boolean;
}

function SmoothScroll({ children, isInsideModal = false }: LenisProps) {
  const lenis = useLenis(({ scroll }) => {
    // called every scroll
  });

  useEffect(() => {
    document.addEventListener("DOMContentLoaded", () => {
      lenis?.stop();
      lenis?.start();
    });
  }, [lenis]);

  useEffect(() => {
    // Make Lenis instance globally accessible for modal control
    if (lenis) {
      (window as any).lenisScroll = lenis;
    }
  }, [lenis]);

  return (
    <ReactLenis
      root
      options={{
        duration: 2,
        prevent: (node) => {
          if (isInsideModal) return true;
          // Check if we're inside a modal using data attribute
          return !!node.closest('[data-modal-wrapper]');
        },
      }}
    >
      {children}
    </ReactLenis>
  );
}

export default SmoothScroll;
