import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type TooltipProps = {
  content: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

const TooltipPortal: React.FC<{
  content: string;
  targetRef: React.RefObject<HTMLElement | null>;
  show: boolean;
  className?: string;
}> = ({ content, targetRef, show, className }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX + rect.width / 2
      });
    }
  }, [show, targetRef]);

  if (!show) return null;

  return createPortal(
    <div
      className={`fixed bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 whitespace-nowrap shadow-lg pointer-events-none transform -translate-x-1/2 transition-opacity ${className || ''}`}
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

  return (
    <>
      <div
        ref={targetRef as React.RefObject<HTMLDivElement | null>}
        onMouseEnter={() => !disabled && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-block"
      >
        {children}
      </div>

      <TooltipPortal
        content={content}
        targetRef={targetRef}
        show={showTooltip && !disabled}
        className={className}
      />
    </>
  );
};

export default Tooltip;