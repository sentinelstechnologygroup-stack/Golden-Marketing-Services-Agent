import React from 'react';

export default function BrandMark({ compact = false, inverse = true, className = '' }) {
  return (
    <div className={`inline-flex max-w-full items-center ${inverse ? '' : 'rounded-xl bg-[#07111F] px-3 py-2'} ${className}`}>
      <img
        src="/brand/gms-logo-horizontal-dark.png"
        alt="Golden Marketing Services Agent Portal"
        className={`${compact ? 'h-9 w-[150px]' : 'h-auto w-[218px]'} max-w-full object-contain`}
        width="1600"
        height="500"
        decoding="async"
      />
    </div>
  );
}
