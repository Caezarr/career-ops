import { companyBrand } from '../data/mock';

interface CompanyAvatarProps {
  company: string;
  size?: number;
}

export default function CompanyAvatar({ company, size = 28 }: CompanyAvatarProps) {
  const brand = companyBrand(company);
  const fontSize = brand.label.length >= 3 ? size * 0.32 : size * 0.42;

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
