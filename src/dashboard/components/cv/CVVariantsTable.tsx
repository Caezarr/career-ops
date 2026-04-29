import { useState } from 'react';
import CVVariantRow from './CVVariantRow';
import RenameModal from '../shared/RenameModal';
import PreviewFullModal from '../shared/PreviewFullModal';
import { useAppStore } from '../../store';
import { useConfirm, useToast } from '../../primitives';
import { downloadStub } from '../shared/downloadStub';

export default function CVVariantsTable() {
  const cvs = useAppStore((s) => s.cvs);
  const selectedCvId = useAppStore((s) => s.selectedCvId);
  const setSelectedCv = useAppStore((s) => s.setSelectedCv);
  const setDefaultCv = useAppStore((s) => s.setDefaultCv);
  const renameCV = useAppStore((s) => s.renameCV);
  const duplicateCV = useAppStore((s) => s.duplicateCV);
  const deleteCV = useAppStore((s) => s.deleteCV);

  const toast = useToast();
  const confirm = useConfirm();

  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{ id: string; name: string } | null>(null);

  function handleSetDefault(id: string, name: string) {
    setDefaultCv(id);
    toast.success(`${name} is now your default CV`);
  }

  function handleDuplicate(id: string) {
    const dup = duplicateCV(id);
    if (dup) toast.success(`Duplicated as ${dup.name}`);
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: `Delete ${name}?`,
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      deleteCV(id);
      toast.success(`${name} deleted`);
    }
  }

  return (
    <>
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
          {cvs.map((variant) => (
            <CVVariantRow
              key={variant.id}
              variant={variant}
              selected={selectedCvId === variant.id}
              onSelect={setSelectedCv}
              onSetDefault={() => handleSetDefault(variant.id, variant.name)}
              onRename={() => setRenameTarget({ id: variant.id, name: variant.name })}
              onDuplicate={() => handleDuplicate(variant.id)}
              onPreview={() => setPreviewTarget({ id: variant.id, name: variant.name })}
              onDelete={() => handleDelete(variant.id, variant.name)}
            />
          ))}
        </div>
      </div>

      <RenameModal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        initialName={renameTarget?.name ?? ''}
        title="Rename CV"
        label="CV name"
        onSave={(name) => {
          if (renameTarget) {
            renameCV(renameTarget.id, name);
            toast.success('CV renamed');
          }
        }}
      />

      <PreviewFullModal
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        cvId={previewTarget?.id}
        cvName={previewTarget?.name}
        onExport={() => {
          const fname = `${(previewTarget?.name ?? 'cv').replace(/\s+/g, '-')}.pdf`;
          downloadStub(fname, `Stub export for ${previewTarget?.name ?? 'CV'}`);
          toast.success('CV exported as PDF');
        }}
      />
    </>
  );
}
