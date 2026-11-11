import { Upload, AlertCircle } from 'lucide-react';
import UploadZone from '../UploadZone';

export default function LegalDocumentsTab({ 
  visibleZones, docs, handleUpload, uploadingKey, errors
}: any) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: '#0f172a' }}>
        <Upload size={20} style={{ color: '#2563eb' }} /> Upload Documents
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        Upload up to 4 files in each box. Accepted formats: PDF, JPG, PNG. Max 10MB per file.
      </p>
      <div className="grid grid-cols-1 gap-4">
        {visibleZones.map((zone: any) => (
          <UploadZone
            key={zone.key}
            zoneKey={zone.key}
            label={zone.label}
            sub={zone.sub}
            icon={zone.icon}
            color={zone.color}
            required={zone.required}
            docs={docs[zone.key] || []}
            onUpload={handleUpload}
            uploadingKey={uploadingKey}
          />
        ))}
      </div>
      {(errors['NATIONAL_ID'] || errors['BANK_STATEMENT'] || errors['PASSPORT_PHOTO'] || errors.documents) && (
        <p className="text-xs text-red-500 mt-3 flex items-center gap-1">
          <AlertCircle size={11} /> {errors.documents || 'Please upload all required documents before submitting.'}
        </p>
      )}
    </div>
  );
}
