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

export const FitToViewIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* フィット表示: 4方向矢印が内向き + 中央に矩形 */}
    {/* 外枠 */}
    <rect x="1" y="1" width="14" height="14" stroke="currentColor" strokeWidth="1" opacity="0.3" rx="1"/>
    
    {/* 中央の矩形（キャンバスを表現） */}
    <rect x="6" y="6" width="4" height="4" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    
    {/* 4方向の内向き矢印 */}
    {/* 左から右へ */}
    <path d="M2 8L4 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M3.5 7.5L4 8L3.5 8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    
    {/* 右から左へ */}
    <path d="M14 8L12 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M12.5 7.5L12 8L12.5 8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    
    {/* 上から下へ */}
    <path d="M8 2L8 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M7.5 3.5L8 4L8.5 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    
    {/* 下から上へ */}
    <path d="M8 14L8 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M7.5 12.5L8 12L8.5 12.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);