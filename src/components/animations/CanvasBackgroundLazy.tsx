"use client";

import dynamic from "next/dynamic";

// three.js is the largest dependency in the bundle and the canvas is purely
// decorative, so keep it out of the initial download/parse path. It mounts
// after hydration; the page background color matches the shader's backColor,
// so there is no visible flash.
const CanvasBackground = dynamic(() => import("./CanvasBackground"), {
  ssr: false,
});

export default function CanvasBackgroundLazy() {
  return <CanvasBackground />;
}
