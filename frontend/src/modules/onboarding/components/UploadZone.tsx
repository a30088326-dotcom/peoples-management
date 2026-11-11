import { useRef, useState } from 'react';
import type { DragEvent, ChangeEvent, ReactNode } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, Clock, FileText } from 'lucide-react';
import { ProtectedFileLink } from '../../../components/ProtectedFile';

interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize?: string;
  fileType?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionNote?: string;
  fileUrl?: string;
}

export default function UploadZone({
  zoneKey, label, sub, icon, color, required, docs, onUpload, uploadingKey
}: {
  zoneKey: string;
  label: string;
  sub: string;
  icon: ReactNode;
  color: string;
  required: boolean;
  docs: UploadedDocument[];
  onUpload: (key: string, files: File[]) => Promise<void>;
  uploadingKey: string | null;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingKey === zoneKey;
  const rejectedCount = docs.filter(doc => doc.status === 'REJECTED').length;
  const available = Math.max(0, 4 - docs.length + rejectedCount);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length && !uploadingKey && available > 0) void onUpload(zoneKey, files);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length) void onUpload(zoneKey, files);
  };

  return (
    <div
      className={`upload-zone p-5 transition-all ${isDragging ? 'drag-over' : ''}`}
      style={{ cursor: 'default' }}
      onDragOver={event => { event.preventDefault(); if (available > 0) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={handleChange}
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        aria-label={`Upload ${label} files`}
      />
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}12`, color }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm text-slate-800">{label}{required ? ' *' : ''}</p>
            <span className="text-xs font-medium text-slate-500">{docs.length}/4 files</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{sub}</p>
        </div>
      </div>

      {docs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {docs.map(doc => (
            <li key={doc.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <FileText size={17} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                {doc.fileUrl ? (
                  <ProtectedFileLink value={doc.fileUrl} className="block truncate text-sm font-medium text-blue-700 hover:underline">
                    {doc.fileName}
                  </ProtectedFileLink>
                ) : <p className="truncate text-sm font-medium text-slate-700">{doc.fileName}</p>}
                <p className="text-xs text-slate-400">{doc.fileSize} {doc.fileType ? `· ${doc.fileType}` : ''}</p>
                {doc.status === 'REJECTED' && (
                  <p className="text-xs text-red-600 mt-1">{doc.rejectionNote || 'Rejected by HR. Upload a replacement.'}</p>
                )}
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${doc.status === 'APPROVED' ? 'text-green-700' : doc.status === 'REJECTED' ? 'text-red-600' : 'text-amber-600'}`}>
                {doc.status === 'APPROVED' ? <CheckCircle2 size={13} /> : doc.status === 'REJECTED' ? <AlertCircle size={13} /> : <Clock size={13} />}
                {doc.status === 'APPROVED' ? 'Approved' : doc.status === 'REJECTED' ? 'Rejected' : 'Pending'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {rejectedCount > 0 ? 'New uploads replace rejected files first.' : available > 0 ? 'Select several files or drag them here.' : 'Maximum 4 files reached.'}
        </p>
        <button
          type="button"
          className="btn-secondary flex items-center gap-2 text-xs whitespace-nowrap"
          onClick={() => inputRef.current?.click()}
          disabled={available === 0 || uploadingKey !== null}
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isUploading ? 'Uploading...' : rejectedCount > 0 ? 'Replace / add files' : docs.length ? 'Add files' : 'Choose files'}
        </button>
      </div>
    </div>
  );
}
