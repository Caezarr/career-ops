import { useState } from 'react';
import CVVariantRow from './CVVariantRow';
import { mockCVVariants } from '../../data/cv';

export default function CVVariantsTable() {
  const [selectedId, setSelectedId] = useState<string>('1');

  return (
    <div className="cv-variants" role="table" aria-label="CV variants">
      <div className="cv-variants__row cv-variants__row--header" role="row">
        <div className="cv-variants__header-cell" role="columnheader" />
        <div className="cv-variants__header-cell" role="columnheader">Name</div>
        <div className="cv-variants__header-cell" role="columnheader">Last edited</div>
        <div className="cv-variants__header-cell" role="columnheader">File type</div>
        <div className="cv-variants__header-cell" role="columnheader">Role focus</div>
        <div className="cv-variants__header-cell" role="columnheader">ATS score</div>
        <div className="cv-variants__header-cell" role="columnheader">Actions</div>
      </div>
      <div className="cv-variants__body">
        {mockCVVariants.map((variant) => (
          <CVVariantRow
            key={variant.id}
            variant={variant}
            selected={selectedId === variant.id}
            onSelect={setSelectedId}
          />
        ))}
      </div>
    </div>
  );
}
