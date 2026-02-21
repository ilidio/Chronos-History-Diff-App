// src/components/ChronosLogo.tsx
import React from 'react';

interface ChronosLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

const ChronosLogo: React.FC<ChronosLogoProps> = ({ width = 24, height = 24, className }) => (
  <svg width={width} height={height} viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="1024" height="1024" rx="200" fill="#007ACC"/>
    <path d="M512 256C370.613 256 256 370.613 256 512C256 653.387 370.613 768 512 768C653.387 768 768 653.387 768 512C768 450.667 746.667 394.667 710.4 349.867" stroke="white" strokeWidth="80" strokeLinecap="round"/>
    <path d="M710.4 349.867V200M710.4 349.867H860" stroke="white" strokeWidth="80" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M512 512L512 350M512 512L620 620" stroke="white" strokeWidth="80" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default ChronosLogo;