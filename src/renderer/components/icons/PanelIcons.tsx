import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const PanelCollapseLeftIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* 左パネルを閉じる: [| ] */}
    <line x1="3" y1="2" x2="3" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 6L7 8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="13" y1="2" x2="13" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.3" strokeLinecap="round"/>
  </svg>
);

export const PanelExpandLeftIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* 左パネルを開く: [| ] (反転) */}
    <path d="M6 6L9 8L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="3" y1="2" x2="3" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.3" strokeLinecap="round"/>
    <line x1="13" y1="2" x2="13" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const PanelCollapseRightIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* 右パネルを閉じる: [ |] */}
    <line x1="3" y1="2" x2="3" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.3" strokeLinecap="round"/>
    <path d="M6 6L9 8L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="13" y1="2" x2="13" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const PanelExpandRightIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* 右パネルを開く: [ |] (反転) */}
    <line x1="3" y1="2" x2="3" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 6L7 8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="13" y1="2" x2="13" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.3" strokeLinecap="round"/>
  </svg>
);