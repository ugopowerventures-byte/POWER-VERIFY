import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  imgClassName?: string;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  imgClassName = '',
  showText = false,
  textClassName = '',
  subtitle,
}) => {
  // Height sizing for clean, non-distorted display preserving exact aspect ratio
  const sizeMap = {
    xs: 'h-6 max-w-[90px]',
    sm: 'h-8 max-w-[120px]',
    md: 'h-10 max-w-[150px]',
    lg: 'h-12 max-w-[180px]',
    xl: 'h-16 max-w-[240px]',
    '2xl': 'h-20 max-w-[300px]',
  };

  const imgHeight = sizeMap[size] || 'h-10 max-w-[150px]';

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`inline-flex items-center gap-2.5 cursor-default select-none ${className}`}
    >
      <img
        src="/bazeright-logo.png"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== 'https://i.ibb.co/607HWYP4/file-000000004ef08210aabccee3479c285b.png') {
            target.src = 'https://i.ibb.co/607HWYP4/file-000000004ef08210aabccee3479c285b.png';
          }
        }}
        alt="BAZERIGHTVERIFY Official Logo"
        draggable={false}
        className={`${imgHeight} w-auto object-contain select-none flex-shrink-0 pointer-events-none ${imgClassName}`}
      />
      {showText && (
        <div className="flex flex-col select-none pointer-events-none">
          <span className={`font-black tracking-tight leading-none text-[#142B8C] text-lg ${textClassName}`}>
            BAZERIGHT<span className="text-[#38BDF8]">VERIFY</span>
          </span>
          {subtitle ? (
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#142B8C]/80 mt-0.5">
              {subtitle}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
