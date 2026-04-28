interface MissingKeywordsProps {
  keywords: string[];
}

export default function MissingKeywords({ keywords }: MissingKeywordsProps) {
  return (
    <div className="cv-missing-keywords">
      <h4 className="cv-section-caps">Missing keywords</h4>
      <div className="cv-missing-keywords__list">
        {keywords.map((keyword) => (
          <span key={keyword} className="cv-missing-keywords__pill">
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}
