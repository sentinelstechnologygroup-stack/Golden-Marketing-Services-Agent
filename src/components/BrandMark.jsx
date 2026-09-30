import React from 'react';

export default function BrandMark({ compact = false, inverse = true, className = '' }) {
  return (
    <div className={`inline-flex max-w-full items-center ${inverse ? '' : 'rounded-xl bg-[#071b1e] px-3 py-2'} ${className}`}>
      <img
        src="/brand/gms-logo-horizontal-transparent.png"
        alt="Golden Marketing Services Agent CRM"
        className={`${compact ? 'h-9 w-[150px]' : 'h-auto w-[218px]'} max-w-full object-contain`}
        width="2081"
        height="756"
        decoding="async"
      />
    </div>
  );
}

