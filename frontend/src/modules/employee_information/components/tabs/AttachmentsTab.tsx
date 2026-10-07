import React, { useState, useEffect } from 'react';
import { Upload, Plus, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { eimsApi } from '../../../../lib/api/employee_information_audit';

const API_ORIGIN =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:3001';

const resolveFileUrl = (
  filePath?: string,
  fileUrl?: string
) => {
  const value = fileUrl || filePath;

  if (!value) return '#';

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${API_ORIGIN}${
    value.startsWith('/') ? value : `/${value}`
  }`;
};

export default function AttachmentsTab({ employeeId }: { employeeId?: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employeeId) {
      loadAttachments();
    }
  }, [employeeId]);

  const loadAttachments = async () => {
    setLoading(true);
    try {
      const res = await eimsApi.getAttachments(employeeId!);
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load attachments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!employeeId) {
      alert('You must save the employee record first before uploading attachments.');
      return;
    }

    if (e.target.files && e.target.files.length > 0) {
      const formData = new FormData();
      for (let i = 0; i < e.target.files.length; i++) {
        formData.append('files', e.target.files[i]);
      }

      setLoading(true);
      try {
        const res = await eimsApi.uploadAttachments(employeeId, formData);
        if (res.data.success) {
          loadAttachments();
        }
      } catch (err) {
        console.error('Upload failed', err);
        alert('Failed to upload files.');
      } finally {
        setLoading(false);
      }
    }
  };

  const removeDocument = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    setLoading(true);
    try {
      await eimsApi.deleteAttachment(id);
      loadAttachments();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete attachment.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Verified') return <CheckCircle size={14} className="text-emerald-500" />;
    if (status === 'Rejected') return <XCircle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-amber-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-700">Employee Documents</h3>
          <p className="text-xs text-slate-500">Upload and manage employee identification and qualification documents.</p>
        </div>
        <div className="relative">
          <input 
            type="file" 
            multiple 
            onChange={handleFileUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            disabled={!employeeId || loading}
          />
          <button type="button" disabled={!employeeId || loading} className="btn-primary gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400">
            <Upload size={16} /> {loading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {documents.map((doc, idx) => (
          <div key={doc.id || idx} className="border border-slate-200 rounded-xl p-4 bg-white relative">
            {doc.source === 'onboarding' ? (
              <span className="absolute top-4 right-4 text-xs font-semibold text-blue-600">Onboarding</span>
            ) : (
              <button type="button" onClick={() => removeDocument(doc.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500" aria-label={`Delete ${doc.originalName || doc.fileName}`}>
                <Trash2 size={16} />
              </button>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pr-8">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">File Name</label>
                <div className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-mono overflow-hidden text-ellipsis">
                  {doc.originalName || doc.fileName}
                </div>
                {doc.category && <p className="mt-1 text-xs text-slate-500">{doc.category}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Uploaded By</label>
                <div className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
                  {doc.uploadedBy || 'Employee record'}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Uploaded At</label>
                <div className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '-'}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="text-slate-500">Verification Status:</span>
                <span className={`flex items-center gap-1 ${
                  doc.status === 'Verified' ? 'text-emerald-600' :
                  doc.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {getStatusIcon(doc.status || 'Pending')} {doc.status || 'Pending'}
                </span>
              </div>
              <a href={resolveFileUrl(doc.filePath, doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
                View File
              </a>
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 p-8 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <p className="text-sm mb-2">No documents attached.</p>
            <p className="text-xs">Click the "Upload Files" button to attach files to this record.</p>
          </div>
        )}
      </div>
      
      {!employeeId && (
        <p className="text-xs text-amber-600 font-medium bg-amber-50 p-3 rounded-lg">
          Please note: Documents can only be uploaded after the employee record has been saved for the first time.
        </p>
      )}
    </div>
  );
}
