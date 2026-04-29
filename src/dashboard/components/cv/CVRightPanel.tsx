import { useState } from 'react';
import { Eye, Download } from 'lucide-react';
import CVPreviewCard from './CVPreviewCard';
import ATSScoreCard from './ATSScoreCard';
import StrengthsCard from './StrengthsCard';
import AISuggestionsCard from './AISuggestionsCard';
import PreviewFullModal from '../shared/PreviewFullModal';
import { useToast } from '../../primitives';
import { useAppStore } from '../../store';
import { downloadStub } from '../shared/downloadStub';

export default function CVRightPanel() {
  const toast = useToast();
  const cvs = useAppStore((s) => s.cvs);
  const selectedCvId = useAppStore((s) => s.selectedCvId);
  const selectedCv = cvs.find((c) => c.id === selectedCvId) ?? cvs[0];

  const [previewOpen, setPreviewOpen] = useState(false);

  function exportPdf() {
    const fname = `${(selectedCv?.name ?? 'cv').replace(/\s+/g, '-')}.pdf.txt`;
    downloadStub(fname, `Stub export for ${selectedCv?.name ?? 'CV'}`);
    toast.success('CV exported as PDF');
  }

  return (
    <div className="cv-right">
      <CVPreviewCard />
      <ATSScoreCard />
      <StrengthsCard />
      <AISuggestionsCard />

      <div className="cv-right__actions">
        <button
          type="button"
          className="cv-right__btn cv-right__btn--ghost"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye size={14} strokeWidth={2} />
          <span>Preview full</span>
        </button>
        <button
          type="button"
          className="cv-right__btn cv-right__btn--primary"
          onClick={exportPdf}
        >
          <Download size={14} strokeWidth={2.2} />
          <span>Export PDF</span>
        </button>
      </div>

      <PreviewFullModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        cvName={selectedCv?.name}
        onExport={exportPdf}
      />
    </div>
  );
}
