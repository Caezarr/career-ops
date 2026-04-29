import { useState } from 'react';
import { FolderOpen, ArrowRight } from 'lucide-react';
import DetailHeader from './DetailHeader';
import DetailMeta from './DetailMeta';
import ApplicationMaterials from './ApplicationMaterials';
import ApplicationTimeline from './ApplicationTimeline';
import AINextStepsCard from './AINextStepsCard';
import { useAppStore } from '../../store';
import { useNavigation } from '../../navigation';
import { DocumentsModal, MaterialUploadModal } from '../shared';

export default function ApplicationDetail() {
  const { navigate } = useNavigation();
  const application = useAppStore((s) => {
    const id = s.selectedApplicationId;
    if (!id) return null;
    return s.applications.find((a) => a.id === id) ?? null;
  });
  const job = useAppStore((s) =>
    application ? s.jobs.find((j) => j.id === application.jobId) ?? null : null,
  );

  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  if (!application) {
    return (
      <div className="app-detail">
        <div className="ds-empty" style={{ padding: 48 }}>
          <FolderOpen size={20} />
          <span>Select an application to see details.</span>
        </div>
      </div>
    );
  }

  const company = job?.company ?? '—';
  const role = job?.role ?? '—';
  const location = job?.location ?? '—';

  return (
    <div className="app-detail">
      <DetailHeader
        company={company}
        role={role}
        location={location}
        stage={application.stage}
      />
      <DetailMeta
        salary={application.salary ?? '—'}
        workMode={application.workMode ?? '—'}
        recruiter={application.recruiter ?? '—'}
        appliedDate={`Applied ${application.appliedDate}`}
      />
      <ApplicationMaterials
        materials={application.materials}
        onAdd={() => setUploadOpen(true)}
      />
      <ApplicationTimeline events={application.timeline} />
      <AINextStepsCard steps={application.aiNextSteps} />

      <div className="app-detail__actions">
        <button
          type="button"
          className="app-detail__btn app-detail__btn--ghost"
          onClick={() => setDocumentsOpen(true)}
        >
          <FolderOpen size={16} strokeWidth={2} />
          <span>Open documents</span>
        </button>
        <button
          type="button"
          className="app-detail__btn app-detail__btn--primary"
          onClick={() => navigate('prep')}
        >
          <span>Prepare now</span>
          <ArrowRight size={16} strokeWidth={2.2} />
        </button>
      </div>

      <DocumentsModal
        open={documentsOpen}
        onClose={() => setDocumentsOpen(false)}
        application={application}
      />
      <MaterialUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        applicationId={application.id}
      />
    </div>
  );
}
