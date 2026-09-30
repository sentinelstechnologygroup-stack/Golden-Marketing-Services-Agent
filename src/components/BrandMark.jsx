import React from 'react';

export default function BrandMark({ compact = false, inverse = true, className = '' }) {
  return (
    <div className={`inline-flex max-w-full items-center ${inverse ? '' : 'rounded-xl bg-[#07111F] px-3 py-2'} ${className}`}>
      <img
        src="/brand/gms-logo-horizontal-transparent.png"
        alt="Golden Marketing Services Agent Portal"
        className={`${compact ? 'h-12 w-[230px]' : 'h-auto w-[300px]'} max-w-full object-contain`}
        width="2172"
        height="724"
        decoding="async"
      />
    </div>
  );
}
