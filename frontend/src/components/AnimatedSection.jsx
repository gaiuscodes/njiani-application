import { useScrollAnimation } from '../hooks/useScrollAnimation';

/**
 * AnimatedSection - Wrapper component that adds scroll-triggered animations
 * 
 * @param {ReactNode} children - Content to animate
 * @param {string} animation - Animation type: 'fadeUp', 'fadeIn', 'slideLeft', 'slideRight', 'scale'
 * @param {number} delay - Delay in milliseconds before animation starts
 * @param {string} className - Additional CSS classes
 * @param {number} threshold - Percentage of element visible before triggering (0-1)
 * @param {string} rootMargin - Margin around root element (e.g., '0px' or '-100px')
 * @param {boolean} triggerOnce - Whether to trigger animation only once
 */
const AnimatedSection = ({ 
  children, 
  animation = 'fadeUp', 
  delay = 0,
  className = '',
  threshold,
  rootMargin,
  triggerOnce = true,
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold,
    rootMargin,
    triggerOnce,
  });

  const animationClasses = {
    fadeUp: 'animate-fade-up',
    fadeIn: 'animate-fade-in',
    slideLeft: 'animate-slide-left',
    slideRight: 'animate-slide-right',
    scale: 'animate-scale-in',
  };

  const baseClasses = 'transition-all duration-700 ease-out';
  const visibilityClass = isVisible 
    ? `${animationClasses[animation]} opacity-100` 
    : 'opacity-0';

  return (
    <div
      ref={ref}
      className={`${baseClasses} ${visibilityClass} ${className}`}
      style={{
        transitionDelay: isVisible ? `${delay}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;

