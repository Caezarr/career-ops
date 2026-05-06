import { useState } from 'react';
import { companyBrand } from '../data/mock';

interface CompanyAvatarProps {
  company: string;
  size?: number;
  /** Absolute URL of the company logo. Currently set by the JT
   *  bridge scraper. Falls back to the initials avatar if missing
   *  or if the image fails to load. */
  logoUrl?: string;
}

export default function CompanyAvatar({
  company,
  size = 28,
  logoUrl,
}: CompanyAvatarProps) {
  const [errored, setErrored] = useState(false);
  const brand = companyBrand(company);
  const fontSize = brand.label.length >= 3 ? size * 0.32 : size * 0.42;

  if (logoUrl && !errored) {
    return (
      <span
        className="company-avatar company-avatar--logo"
        style={{
          width: size,
          height: size,
          background: '#fff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: 6,
        }}
        aria-label={company}
        title={company}
      >
        <img
          src={logoUrl}
          alt={company}
          width={size}
          height={size}
          style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
          loading="lazy"
          onError={() => setErrored(true)}
        />
      </span>
    );
  }

  return (
    <span
      className="company-avatar"
      style={{
        width: size,
        height: size,
        background: brand.bg,
        color: brand.fg,
        fontSize,
        border: brand.border ? `1px solid ${brand.border}` : 'none',
      }}
      aria-label={company}
      title={company}
    >
      {brand.label}
    </span>
  );
}
