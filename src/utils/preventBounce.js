// Aggressive JavaScript fix for iOS Safari bounce
// This prevents ALL scrolling bounce effects

(function() {
  'use strict';

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);
  
  if (!isIOS || !isSafari) {
    return; // Only apply to iOS Safari
  }

  let touchStartY = 0;
  let touchMoveY = 0;
  let preventTouch = false;

  // Prevent the default behavior of touchmove if it would cause bounce
  function handleTouchMove(e) {
    const target = e.target;
    let element = target;
    
    // Walk up the DOM to find a scrollable container
    while (element && element !== document.body && element !== document.documentElement) {
      const computedStyle = window.getComputedStyle(element);
      const overflowY = computedStyle.overflowY;
      
      if (overflowY === 'auto' || overflowY === 'scroll') {
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        const deltaY = touchMoveY - touchStartY;
        
        // Prevent scrolling past the top
        if (deltaY > 0 && scrollTop === 0) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        // Prevent scrolling past the bottom
        if (deltaY < 0 && scrollTop + clientHeight >= scrollHeight) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        // Allow normal scrolling within bounds
        return;
      }
      
      element = element.parentElement;
    }
    
    // If no scrollable container found, prevent all movement that could cause bounce
    const deltaY = touchMoveY - touchStartY;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const maxScroll = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    ) - window.innerHeight;
    
    // Prevent bounce at top
    if (deltaY > 0 && scrollTop <= 0) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Prevent bounce at bottom
    if (deltaY < 0 && scrollTop >= maxScroll) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }
  
  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    preventTouch = false;
  }
  
  function handleTouchMoveCapture(e) {
    touchMoveY = e.touches[0].clientY;
    
    // More aggressive prevention
    const result = handleTouchMove(e);
    if (result === false) {
      preventTouch = true;
    }
  }
  
  function handleTouchEnd(e) {
    if (preventTouch) {
      e.preventDefault();
      e.stopPropagation();
    }
    preventTouch = false;
  }

  // Add listeners with capture phase for more control
  document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
  document.addEventListener('touchmove', handleTouchMoveCapture, { passive: false, capture: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });

  // Additional prevention for specific gestures
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  }, false);
  
  document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
  }, false);
  
  document.addEventListener('gestureend', function(e) {
    e.preventDefault();
  }, false);

  // Prevent default scroll behavior on the document itself
  document.addEventListener('scroll', function(e) {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    
    // If trying to scroll beyond bounds, reset scroll position
    if (scrollTop < 0) {
      window.scrollTo(0, 0);
    } else if (scrollTop > maxScroll) {
      window.scrollTo(0, maxScroll);
    }
  }, { passive: false });

  // Set up ResizeObserver to handle orientation changes
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(function(entries) {
      // Force scroll position check after resize
      setTimeout(function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        
        if (scrollTop < 0) {
          window.scrollTo(0, 0);
        } else if (scrollTop > maxScroll) {
          window.scrollTo(0, maxScroll);
        }
      }, 100);
    });
    
    resizeObserver.observe(document.body);
  }

  // Handle window focus/blur to reset state
  window.addEventListener('focus', function() {
    preventTouch = false;
  });
  
  window.addEventListener('blur', function() {
    preventTouch = false;
  });

  console.log('🔧 Aggressive iOS Safari bounce prevention loaded');
})();

// React hook version
export function useAggressivePreventBounce() {
  React.useEffect(() => {
    // The IIFE above will already be executed when this module loads
    // This hook just ensures it's active when the component mounts
    
    return () => {
      // Cleanup if needed
    };
  }, []);
}

// Function to apply bounce prevention to specific elements
export function preventBounceOnElement(element) {
  if (!element) return;
  
  let touchStartY = 0;
  
  function handleElementTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }
  
  function handleElementTouchMove(e) {
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY;
    
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Prevent bounce at top
    if (deltaY > 0 && scrollTop === 0) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent bounce at bottom
    if (deltaY < 0 && scrollTop + clientHeight >= scrollHeight) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  
  element.addEventListener('touchstart', handleElementTouchStart, { passive: false });
  element.addEventListener('touchmove', handleElementTouchMove, { passive: false });
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleElementTouchStart);
    element.removeEventListener('touchmove', handleElementTouchMove);
  };
}