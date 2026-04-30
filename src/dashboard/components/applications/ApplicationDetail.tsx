import { useState } from 'react';
import { FolderOpen, Play } from 'lucide-react';
import DetailHeader from './DetailHeader';
import DetailMeta from './DetailMeta';
import ApplicationMaterials from './ApplicationMaterials';
import ApplicationTimeline from './ApplicationTimeline';
import AINextStepsCard from './AINextStepsCard';
import ApplicationCopilotSessions from './ApplicationCopilotSessions';
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
  const setPickerJobId = useAppStore((s) => s.setCopilotPickerJobId);
  const setPickerCvId = useAppStore((s) => s.setCopilotPickerCvId);

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
        applicationId={application.id}
        salary={application.salary}
        workMode={application.workMode}
        recruiter={application.recruiter}
        sourceUrl={application.sourceUrl}
        coverLetter={application.coverLetter}
        appliedDate={`Applied ${application.appliedDate}`}
      />
      <ApplicationMaterials
        materials={application.materials}
        onAdd={() => setUploadOpen(true)}
      />
      <ApplicationTimeline events={application.timeline} />
      <AINextStepsCard
        application={application}
        // Job is the source of truth for company / role / JD text. We
        // pass the slim shape the card needs rather than the whole
        // Job object to keep the boundary tight.
        job={job ? { company: job.company, role: job.role, jdText: job.jdText } : null}
      />

      {/* Tied Copilot history — surfaces past mock interviews / pitches
           for this exact job, with one-click "Start session" that
           pre-sets the picker and jumps to the Copilot page. */}
      <ApplicationCopilotSessions
        jobId={application.jobId}
        cvId={application.cvId}
      />

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
          onClick={() => {
            // Pre-set the Copilot picker so the page lands on this
            // job + CV as the active context. The "Prep" page is
            // about practice questions; the Copilot is what the
            // user actually wants to fire when prepping a
            // specific application.
            setPickerJobId(application.jobId);
            if (application.cvId) setPickerCvId(application.cvId);
            navigate('copilot');
          }}
        >
          <Play size={14} strokeWidth={2} fill="currentColor" />
          <span>Open Copilot for this role</span>
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
