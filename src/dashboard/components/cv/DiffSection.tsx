interface DiffSectionProps {
  removeReduce: string[];
  addStrengthen: string[];
}

export default function DiffSection({ removeReduce, addStrengthen }: DiffSectionProps) {
  return (
    <div className="cv-diff">
      <div className="cv-diff__col">
        <h4 className="cv-diff__heading cv-diff__heading--remove">Remove / Reduce</h4>
        <ul className="cv-diff__list">
          {removeReduce.map((item, idx) => (
            <li key={idx} className="cv-diff__item">
              <span className="cv-diff__sign cv-diff__sign--remove" aria-hidden="true">−</span>
              <span className="cv-diff__text cv-diff__text--remove">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="cv-diff__col">
        <h4 className="cv-diff__heading cv-diff__heading--add">Add / Strengthen</h4>
        <ul className="cv-diff__list">
          {addStrengthen.map((item, idx) => (
            <li key={idx} className="cv-diff__item">
              <span className="cv-diff__sign cv-diff__sign--add" aria-hidden="true">+</span>
              <span className="cv-diff__text cv-diff__text--add">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
