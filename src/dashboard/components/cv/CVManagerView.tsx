import UploadZone from './UploadZone';
import CVVariantsTable from './CVVariantsTable';
import TailoringWorkspace from './TailoringWorkspace';

export default function CVManagerView() {
  return (
    <>
      <UploadZone />
      <CVVariantsTable />
      <TailoringWorkspace />
    </>
  );
}
