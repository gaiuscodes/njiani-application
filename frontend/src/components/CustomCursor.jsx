import { useEffect, useState } from 'react';

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const updateCursor = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    // Check for interactive elements
    const handleMouseOver = (e) => {
      try {
        const target = e.target;
        if (!target) return;
        
        const isInteractive = 
          target.tagName === 'A' ||
          target.tagName === 'BUTTON' ||
          (target.closest && (target.closest('a') || target.closest('button'))) ||
          target.onclick ||
          target.style.cursor === 'pointer' ||
          (window.getComputedStyle && window.getComputedStyle(target).cursor === 'pointer');
        
        if (isInteractive) {
          setIsHovering(true);
        }
      } catch (error) {
        // Silently handle any errors - don't break the app
      }
    };

    const handleMouseOut = () => {
      setIsHovering(false);
    };

    document.addEventListener('mousemove', updateCursor);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);

    // Hide default cursor only on body
    document.body.style.cursor = 'none';

    return () => {
      document.removeEventListener('mousemove', updateCursor);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <>
      {/* Main cursor */}
      <div
        className="fixed pointer-events-none z-[9999] transition-all duration-300 ease-out"
        style={{
          left: `${position.x || 0}px`,
          top: `${position.y || 0}px`,
          transform: 'translate(-50%, -50%)',
          opacity: position.x === 0 && position.y === 0 ? 0 : 1,
        }}
      >
        <div
          className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
            isHovering
              ? 'bg-primary-500 border-primary-400 opacity-80 scale-150'
              : isClicking
              ? 'bg-primary-600 border-primary-500 opacity-90 scale-125'
              : 'bg-transparent border-primary-500 scale-100'
          }`}
        />
      </div>

      {/* Outer ring */}
      <div
        className="fixed pointer-events-none z-[9998] transition-all duration-500 ease-out"
        style={{
          left: `${position.x || 0}px`,
          top: `${position.y || 0}px`,
          transform: 'translate(-50%, -50%)',
          opacity: position.x === 0 && position.y === 0 ? 0 : 1,
        }}
      >
        <div
          className={`w-8 h-8 rounded-full border transition-all duration-500 ${
            isHovering
              ? 'border-primary-400 opacity-30 scale-200'
              : 'border-primary-500 opacity-50 scale-100'
          }`}
        />
      </div>
    </>
  );
};

export default CustomCursor;
