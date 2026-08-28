import React, { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type TooltipProps = {
  content: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

const TooltipPortal: React.FC<{
  id: string;
  content: string;
  targetRef: React.RefObject<HTMLElement | null>;
  show: boolean;
  className?: string;
}> = ({ id, content, targetRef, show, className }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX + rect.width / 2
      });
    }
  }, [show, targetRef]);

  if (!show) return null;

  return createPortal(
    <div
      id={id}
      role="tooltip"
      className={`absolute bg-vtk-ink text-vtk-paper border border-vtk-line rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-lg pointer-events-none transform -translate-x-1/2 transition-opacity ${className || ''}`}
      style={{ top: position.top, left: position.left, zIndex: 10000 }}
    >
      {content}
    </div>,
    document.body
  );
};

const Tooltip: React.FC<TooltipProps> = ({ content, children, className, disabled = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const targetRef = useRef<HTMLElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTooltip) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showTooltip]);

  return (
    <>
      <div
        ref={targetRef as React.RefObject<HTMLDivElement | null>}
        onMouseEnter={() => !disabled && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => !disabled && setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-describedby={showTooltip && !disabled ? tooltipId : undefined}
        className="inline-block"
      >
        {children}
      </div>

      <TooltipPortal
        id={tooltipId}
        content={content}
        targetRef={targetRef}
        show={showTooltip && !disabled}
        className={className}
      />
    </>
  );
};

export default Tooltip;