import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud, Upload } from 'lucide-react';
import { useToast } from '../../primitives';
import { useAppStore } from '../../store';

export default function UploadZone() {
  const toast = useToast();
  const createCV = useAppStore((s) => s.createCV);
  const setSelectedCv = useAppStore((s) => s.setSelectedCv);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function ingest(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('PDF only, please');
      return;
    }
    const cv = createCV({
      name: file.name.replace(/\.pdf$/i, ''),
      roleFocus: 'General',
    });
    setSelectedCv(cv.id);
    toast.success(`${file.name} uploaded`);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingest(file);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
  }

  function trigger() {
    fileRef.current?.click();
  }

  return (
    <div
      className={`cv__upload-zone${dragging ? ' cv__upload-zone--dragging' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnter={onDragOver}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) ingest(f);
          e.target.value = '';
        }}
      />
      <div className="cv__upload-icon" aria-hidden="true">
        <UploadCloud size={22} strokeWidth={2} />
      </div>
      <div className="cv__upload-text">
        <div className="cv__upload-primary">
          Drop PDF here or{' '}
          <button
            type="button"
            className="cv__upload-link"
            onClick={(e) => {
              e.preventDefault();
              trigger();
            }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            browse files
          </button>
        </div>
        <div className="cv__upload-secondary">PDF only, max 10MB</div>
      </div>
      <button type="button" className="cv__upload-btn" onClick={trigger}>
        <Upload size={14} strokeWidth={2} />
        <span>Upload</span>
      </button>
    </div>
  );
}
