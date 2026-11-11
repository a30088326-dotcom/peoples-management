import { FileText, Landmark, Image, Briefcase, Clock, CheckCircle2, XCircle } from 'lucide-react';

export interface VerificationDocument {
  id: string; type: string; status: string; label?: string; fileName?: string;
  fileType?: string; fileUrl: string; fileSize?: string; rejectionNote?: string; verifiedAt?: string;
}

const icons = { NATIONAL_ID: <FileText size={20} />, BANK_STATEMENT: <Landmark size={20} />,
  PASSPORT_PHOTO: <Image size={20} />, EMPLOYMENT_DOCS: <Briefcase size={20} />,
  PREVIOUS_SERVICE: <Briefcase size={20} />, OTHER: <FileText size={20} /> };
const labels: Record<string, string> = { NATIONAL_ID: 'National ID', BANK_STATEMENT: 'Bank Statement',
  PASSPORT_PHOTO: 'Passport Photo', EMPLOYMENT_DOCS: 'Employment Documents', PREVIOUS_SERVICE: 'Previous Service', OTHER: 'Other Document' };
const colors: Record<string, string> = { NATIONAL_ID: '#2563eb', BANK_STATEMENT: '#7c3aed', PASSPORT_PHOTO: '#0891b2', EMPLOYMENT_DOCS: '#059669', PREVIOUS_SERVICE: '#0e7490' };
const statuses = {
  PENDING: { label: 'Pending Review', color: '#a16207', bg: '#fef9c3', icon: <Clock size={12} /> },
  APPROVED: { label: 'Approved', color: '#15803d', bg: '#dcfce7', icon: <CheckCircle2 size={12} /> },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={12} /> },
};
export const documentLabel = (document: VerificationDocument) => document.label || labels[document.type] || document.fileName || 'Uploaded Document';
export const documentIcon = (type: string) => icons[type as keyof typeof icons] || icons.OTHER;
export const documentColor = (type: string) => colors[type] || '#475569';
export const documentStatus = (status: string) => statuses[status as keyof typeof statuses] || statuses.PENDING;
