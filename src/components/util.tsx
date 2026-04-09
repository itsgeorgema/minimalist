export const isMobile = (): boolean => {
  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      ua
    );
  }
  return false;
};

export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    (navigator as any).maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

export const isCoarsePointer = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

export const isTouchOrCoarse = (): boolean => {
  return isTouchDevice() || isCoarsePointer();
};

export const isTouchOrMobile = (): boolean => {
  return isMobile() || isTouchOrCoarse();
};
