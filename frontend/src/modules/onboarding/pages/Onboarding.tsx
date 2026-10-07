import { useState, useEffect } from 'react';
import {
  User, Phone, MapPin, CreditCard, Upload, CheckCircle2,
  ArrowRight, ArrowLeft, FileText, Image, Landmark,
  AlertCircle, Briefcase, Loader2
} from 'lucide-react';
import PersonalInformationTab from '../components/tabs/PersonalInformationTab';
import ContactInformationTab from '../components/tabs/ContactInformationTab';
import BankingDetailsTab from '../components/tabs/BankingDetailsTab';
import LegalDocumentsTab from '../components/tabs/LegalDocumentsTab';
import { onboardingApi, documentsApi, contractsApi } from '../../../lib/api';
import type { Screen } from '../../../types';

interface OnboardingProps {
  onNavigate: (s: Screen) => void;
}

type OnboardingStep = 1 | 2 | 3 | 4;

const STEPS: { step: OnboardingStep; label: string; icon: React.ReactNode }[] = [
  { step: 1, label: 'Personal', icon: <User size={16} /> },
  { step: 2, label: 'Contact', icon: <Phone size={16} /> },
  { step: 3, label: 'Banking', icon: <CreditCard size={16} /> },
  { step: 4, label: 'Documents', icon: <Upload size={16} /> },
];

const DOCUMENT_ZONES = [
  { key: 'NATIONAL_ID', label: 'Government ID', sub: 'Passport · NIC · Driver\'s License', icon: <FileText size={28} />, color: '#2563eb', required: true },
  { key: 'BANK_STATEMENT', label: 'Bank Statement', sub: 'Latest 3 months · Any bank', icon: <Landmark size={28} />, color: '#7c3aed', required: true },
  { key: 'PASSPORT_PHOTO', label: 'Passport Photo', sub: 'White background · Recent', icon: <Image size={28} />, color: '#0891b2', required: true },
  { key: 'EMPLOYMENT_DOCS', label: 'Previous Employment', sub: 'Experience letters · Offer letter', icon: <Briefcase size={28} />, color: '#059669', required: false },
  { key: 'PREVIOUS_SERVICE', label: 'Previous Service', sub: 'Service letters · Certificates of service', icon: <Briefcase size={28} />, color: '#0e7490', required: false },
];

// ── Stepper Component ─────────────────────────────────────────────────────────
function Stepper({ current }: { current: OnboardingStep }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((s, i) => (
        <div key={s.step} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`step-ring ${
              current === s.step ? 'step-ring-active' :
              current > s.step ? 'step-ring-done' : 'step-ring-idle'
            }`}>
              {current > s.step ? <CheckCircle2 size={18} /> : s.step}
            </div>
            <span className="text-xs font-semibold" style={{
              color: current === s.step ? '#2563eb' : current > s.step ? '#15803d' : '#94a3b8',
            }}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`step-line ${current > s.step ? 'step-line-done' : ''}`}
              style={{ width: 80, margin: '0 12px', marginBottom: 24 }} />
          )}
        </div>
      ))}
    </div>
  );
}



// ── Main Component ────────────────────────────────────────────────────────────
export default function Onboarding({ onNavigate }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [isClosed, setIsClosed] = useState(false);
  
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: '', nationality: '',
    addressLine1: '', addressLine2: '', city: '', postalCode: '',
    phoneNumber: '', alternatePhone: '', linkedIn: '',
    emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
    bankName: '', accountHolderName: '', accountNumber: '',
    accountType: 'SAVINGS' as 'SAVINGS' | 'CHECKING', currency: 'USD'
  });

  const [docs, setDocs] = useState<Record<string, any[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [hasContractSent, setHasContractSent] = useState(false);

  // Load existing profile & docs if any
  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, docsRes, contractsRes] = await Promise.all([
          onboardingApi.get(),
          documentsApi.list(),
          contractsApi.list().catch(() => ({ data: { data: [] } }))
        ]);
        
        if (profileRes.data.data) {
          const d = profileRes.data.data;
          setForm({
            firstName: d.firstName, lastName: d.lastName, 
            dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth).toISOString().split('T')[0] : '', 
            gender: d.gender, nationality: d.nationality || '',
            addressLine1: d.addressLine1, addressLine2: d.addressLine2 || '', 
            city: d.city, postalCode: d.postalCode || '',
            phoneNumber: d.phoneNumber, alternatePhone: d.alternatePhone || '', linkedIn: d.linkedIn || '',
            emergencyContactName: d.emergencyContactName, emergencyContactRelation: d.emergencyContactRelation || '', 
            emergencyContactPhone: d.emergencyContactPhone,
            bankName: d.bankName || '', accountHolderName: d.accountHolderName || '', accountNumber: d.accountNumber || '',
            accountType: d.accountType as 'SAVINGS' | 'CHECKING', currency: d.currency || 'USD'
          });
        }

        const docsMap: Record<string, any[]> = {};
        docsRes.data.data.forEach((doc: any) => {
          (docsMap[doc.type] ||= []).push(doc);
        });
        setDocs(docsMap);

        if (contractsRes.data.data.some((c: any) => c.status === 'SENT')) {
          setHasContractSent(true);
        }

        // Auto-advance step if profile exists
        if (profileRes.data.data) {
          const hasRequiredDocs = DOCUMENT_ZONES.filter(z => z.required).every(z => {
            return docsMap[z.key]?.some(doc => doc.status !== 'REJECTED');
          });
          const hasRejectedDocs = Object.values(docsMap).flat().some(d => d.status === 'REJECTED');

          if (hasRequiredDocs && !hasRejectedDocs) {
            setDone(true);
          } else {
            setStep(4);
          }
        }

      } catch (err) {
        console.error('Failed to load existing onboarding data', err);
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, []);

  const setF = (k: keyof typeof form, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
    setApiError('');
  };

  const handleUpload = async (key: string, files: File[]) => {
    const current = docs[key] || [];
    const available = Math.max(0, 4 - current.length + current.filter(doc => doc.status === 'REJECTED').length);
    if (files.length > available) {
      setApiError(`You can add only ${available} more file${available === 1 ? '' : 's'} to this document box (maximum 4).`);
      return;
    }
    setUploadingKey(key);
    setApiError('');
    setUploadSuccess('');
    try {
      const label = DOCUMENT_ZONES.find(z => z.key === key)?.label || key;
      for (const file of files) {
        const res = await documentsApi.upload(file, key, label);
        const uploaded = res.data.data;
        setDocs(p => {
          const existing = p[key] || [];
          const index = existing.findIndex(doc => doc.id === uploaded.id);
          const next = [...existing];
          if (index >= 0) next[index] = uploaded;
          else next.push(uploaded);
          return { ...p, [key]: next };
        });
      }
      setUploadSuccess(`${files.length} ${label} file${files.length === 1 ? '' : 's'} uploaded. Waiting for HR verification.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? 'A document upload failed. Files already uploaded were saved.');
    } finally {
      setUploadingKey(null);
    }
  };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim()) e.lastName = 'Required';
      if (!form.dateOfBirth) e.dateOfBirth = 'Required';
      if (!form.gender) e.gender = 'Required';
      if (!form.addressLine1.trim()) e.addressLine1 = 'Required';
      if (!form.city.trim()) e.city = 'Required';
    }
    if (step === 2) {
      if (!form.phoneNumber.trim()) e.phoneNumber = 'Required';
      if (!form.emergencyContactName.trim()) e.emergencyContactName = 'Required';
      if (!['Father', 'Mother', 'Other'].includes(form.emergencyContactRelation)) e.emergencyContactRelation = 'Choose Father, Mother, or Other';
      if (!form.emergencyContactPhone.trim()) e.emergencyContactPhone = 'Required';
    }
    if (step === 3) {
      if (!form.bankName.trim()) e.bankName = 'Required';
      if (!form.accountHolderName.trim()) e.accountHolderName = 'Required';
      if (!form.accountNumber.trim()) e.accountNumber = 'Required';
    }
    if (step === 4) {
      if (!docs['NATIONAL_ID']?.some(doc => doc.status !== 'REJECTED')) e['NATIONAL_ID'] = 'Required';
      if (!docs['BANK_STATEMENT']?.some(doc => doc.status !== 'REJECTED')) e['BANK_STATEMENT'] = 'Required';
      if (!docs['PASSPORT_PHOTO']?.some(doc => doc.status !== 'REJECTED')) e['PASSPORT_PHOTO'] = 'Required';
      if (Object.values(docs).flat().some(doc => doc.status === 'REJECTED')) e['documents'] = 'Replace rejected documents before submitting';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    
    // Auto-save form on step 3 complete
    if (step === 3) {
      setSubmitting(true);
      setApiError('');
      try {
        await onboardingApi.submit(form);
        setStep(4);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        setApiError(e.response?.data?.message ?? 'Failed to save profile details');
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep((step + 1) as OnboardingStep);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setApiError('');
    try {
      // Ensure latest details are saved
      await onboardingApi.submit(form);
      setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? 'Failed to finalize onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Done State ────────────────────────────────────────────────────────────
  if (done) {
    if (hasContractSent) {
      return (
        <div className="ambient-bg min-h-screen flex items-center justify-center p-6">
          <div className="card anim-scale-in text-center" style={{ maxWidth: 480, padding: '3rem 2.5rem' }}>
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full anim-celebrate"
                style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', opacity: 0.12 }} />
              <div className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
                <CheckCircle2 size={44} color="white" />
              </div>
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>
              Action Required: Sign Contract 📝
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Your onboarding documents have been reviewed and approved. Please sign your employment contract to complete the process.
            </p>
            <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: '#f8faff', border: '1px solid #e2e8f0' }}>
              <div className="flex items-center gap-3">
                <FileText size={20} style={{ color: '#2563eb' }} className="flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Employment Contract</p>
                  <p className="text-xs text-slate-400">Awaiting your digital signature</p>
                </div>
              </div>
            </div>
            <button 
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
              onClick={() => onNavigate('contract')}
            >
              Sign Employment Contract <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-6">
        <div className="card anim-scale-in text-center" style={{ maxWidth: 480, padding: '3rem 2.5rem' }}>
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full anim-celebrate"
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', opacity: 0.12 }} />
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
              <CheckCircle2 size={44} color="white" />
            </div>
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>
            Onboarding Complete! 🎉
          </h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Your information and documents have been securely submitted.
            HR will review and verify everything within <strong className="text-slate-700">1–2 business days</strong>.
          </p>
          <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} style={{ color: '#16a34a' }} className="flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">{Object.values(docs).flat().length} documents uploaded</p>
                <p className="text-xs text-slate-400">Pending admin verification</p>
              </div>
            </div>
          </div>
          {isClosed ? (
            <p className="text-sm font-bold text-slate-500 mt-6">You may now close this tab.</p>
          ) : (
            <button 
              className="btn-primary w-full mt-6"
              onClick={() => setIsClosed(true)}
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ambient-bg min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="text-center mb-8 anim-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: '#2563eb' }} />
            <span className="text-xs font-semibold" style={{ color: '#2563eb' }}>Employee Onboarding</span>
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: '#0f172a', letterSpacing: '-0.04em' }}>
            Welcome to the Team.
          </h1>
          <p className="text-slate-400 text-sm">Let's get you set up — it only takes a few minutes.</p>
        </div>

        {/* Stepper */}
        <Stepper current={step} />

        {/* API Error */}
        {apiError && (
          <div className="flex items-center gap-3 p-3 rounded-xl mb-5 mx-auto max-w-xl"
            style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
            <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}
        {uploadSuccess && step === 4 && (
          <div className="flex items-center gap-3 p-3 rounded-xl mb-5 mx-auto max-w-xl"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{uploadSuccess}</p>
          </div>
        )}

        {/* Step Cards */}
        <div className="card anim-fade-up delay-100">

          {/* Step 1: Personal Details */}
          {step === 1 && <PersonalInformationTab form={form} setF={setF} errors={errors} />}

          {/* Step 2: Contact */}
          {step === 2 && <ContactInformationTab form={form} setF={setF} errors={errors} />}

          {/* Step 3: Banking */}
          {step === 3 && <BankingDetailsTab form={form} setF={setF} errors={errors} />}

          {/* Step 4: Documents */}
          {step === 4 && (
            <LegalDocumentsTab
              visibleZones={DOCUMENT_ZONES}
              docs={docs}
              handleUpload={handleUpload}
              uploadingKey={uploadingKey}
              errors={errors}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => setStep((step - 1) as OnboardingStep)}
                disabled={submitting}
              >
                <ArrowLeft size={15} /> Back
              </button>
            )}
            {step < 4 ? (
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={handleNext} disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={15} /></>}
              </button>
            ) : (
              <button
                className="btn-primary btn-primary-pulse flex-1 flex items-center justify-center gap-2"
                onClick={handleSubmit}
                disabled={submitting || uploadingKey !== null}
                style={{ padding: '0.875rem' }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    Submitting Securely...
                  </>
                ) : (
                  <>Submit Documents Securely <CheckCircle2 size={16} /></>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
