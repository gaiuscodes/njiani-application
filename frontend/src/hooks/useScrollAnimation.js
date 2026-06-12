import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for scroll-triggered animations
 * Uses Intersection Observer API to detect when elements enter viewport
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Percentage of element visible before triggering (0-1)
 * @param {string} options.rootMargin - Margin around root element (e.g., '0px' or '-100px')
 * @param {boolean} options.triggerOnce - Whether to trigger animation only once
 * @returns {Object} - { ref: ref to attach to element, isVisible: boolean }
 */
export const useScrollAnimation = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (triggerOnce) {
              observer.unobserve(entry.target);
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Check initial intersection state
    observer.observe(element);
    
    // Trigger initial check for elements already in viewport
    const checkInitialVisibility = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;
      
      // Check if element is in viewport considering rootMargin
      const margin = parseInt(rootMargin) || 0;
      const isVisible = (
        rect.top < windowHeight + margin &&
        rect.bottom > -margin &&
        rect.left < windowWidth + margin &&
        rect.right > -margin
      );
      
      if (isVisible) {
        setIsVisible(true);
        if (triggerOnce) {
          observer.unobserve(element);
        }
      }
    };

    // Use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(checkInitialVisibility);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref: elementRef, isVisible };
};

