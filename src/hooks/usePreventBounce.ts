// src/hooks/usePreventBounce.ts
import { useEffect } from 'react';

// Detect iOS Safari
const isIOSSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIOS && isSafari;
};

// Check if overscroll-behavior is supported
const supportsOverscrollBehavior = (): boolean => {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  return CSS.supports('overscroll-behavior', 'none');
};

// Get iOS version
const getIOSVersion = (): number | null => {
  if (typeof navigator === 'undefined') return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

/**
 * React hook to prevent bounce/rubber band effect on mobile Safari
 * This is a fallback for older iOS versions that don't support overscroll-behavior
 */
export const usePreventBounce = () => {
  useEffect(() => {
    // Only apply for iOS Safari versions < 16 or when overscroll-behavior is not supported
    const iosVersion = getIOSVersion();
    const shouldApplyFix = isIOSSafari() && (!supportsOverscrollBehavior() || (iosVersion && iosVersion < 16));
    
    if (!shouldApplyFix) {
      return;
    }

    let startY = 0;
    let isScrolling = false;

    // Touch start handler
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      isScrolling = false;
    };

    // Touch move handler
    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrolling) {
        isScrolling = true;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      // Get current scroll position
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const maxScroll = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      ) - window.innerHeight;

      // Check if we're trying to scroll past the boundaries
      const scrollingUp = deltaY > 0;
      const scrollingDown = deltaY < 0;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop >= maxScroll;

      // Prevent bounce at top when scrolling up
      if (scrollingUp && atTop) {
        e.preventDefault();
        return false;
      }

      // Prevent bounce at bottom when scrolling down
      if (scrollingDown && atBottom) {
        e.preventDefault();
        return false;
      }
    };

    // Touch end handler
    const handleTouchEnd = () => {
      isScrolling = false;
    };

    // Add event listeners with passive: false to allow preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Cleanup function
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
};

/**
 * Function to prevent bounce on a specific element
 * @param element - The HTML element to prevent bounce on
 */
export const preventBounceOnElement = (element: HTMLElement) => {
  if (!element || !isIOSSafari()) return;

  const handleTouchStart = (e: TouchEvent) => {
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    // If at top, set scroll to 1 to prevent bounce
    if (scrollTop === 0) {
      element.scrollTop = 1;
    }

    // If at bottom, set scroll to slightly above bottom
    if (scrollTop + clientHeight >= scrollHeight) {
      element.scrollTop = scrollHeight - clientHeight - 1;
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: false });

  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
  };
};

// Export utility functions
export { isIOSSafari, supportsOverscrollBehavior, getIOSVersion };