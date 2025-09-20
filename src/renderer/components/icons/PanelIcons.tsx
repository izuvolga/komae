import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const PanelCollapseLeftIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  // Goolge Fonts "left_panel_close"
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M660-320v-320L500-480l160 160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z"/></svg>
);

export const PanelExpandLeftIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  // Goolge Fonts "left_panel_open" icon
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M500-640v320l160-160-160-160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z"/></svg>
);

export const PanelCollapseRightIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  // Goolge Fonts "right_panel_close" icon
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M300-640v320l160-160-160-160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm440-80h120v-560H640v560Zm-80 0v-560H200v560h360Zm80 0h120-120Z"/></svg>
);

export const PanelExpandRightIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  // Goolge Fonts "right_panel_open" icon
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M460-320v-320L300-480l160 160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm440-80h120v-560H640v560Zm-80 0v-560H200v560h360Zm80 0h120-120Z"/></svg>
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
