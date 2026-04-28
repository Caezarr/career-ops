interface SuggestedEditsProps {
  edits: string[];
}

export default function SuggestedEdits({ edits }: SuggestedEditsProps) {
  return (
    <div className="cv-suggested-edits">
      <h4 className="cv-suggested-edits__heading">Suggested edits ({edits.length})</h4>
      <ul className="cv-suggested-edits__list">
        {edits.map((edit, idx) => (
          <li key={idx} className="cv-suggested-edits__item">
            <span className="cv-suggested-edits__dot" aria-hidden="true" />
            <span>{edit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
