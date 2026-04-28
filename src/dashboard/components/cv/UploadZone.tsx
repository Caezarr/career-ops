import { UploadCloud, Upload } from 'lucide-react';

export default function UploadZone() {
  return (
    <div className="cv__upload-zone">
      <div className="cv__upload-icon" aria-hidden="true">
        <UploadCloud size={22} strokeWidth={2} />
      </div>
      <div className="cv__upload-text">
        <div className="cv__upload-primary">
          Drop PDF here or <a href="#" className="cv__upload-link">browse files</a>
        </div>
        <div className="cv__upload-secondary">PDF only, max 10MB</div>
      </div>
      <button type="button" className="cv__upload-btn">
        <Upload size={14} strokeWidth={2} />
        <span>Upload</span>
      </button>
    </div>
  );
}
