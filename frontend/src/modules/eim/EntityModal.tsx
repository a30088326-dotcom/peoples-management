import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { eimApi } from '../../lib/api/eimApi';

export type EntityType = 'company' | 'location' | 'department' | 'designation' | 'salaryGrade' | 'costCentre' | 'corporateTitle' | 'employmentType' | 'employeeTitle' | 'function' | 'functionalRole' | 'statutoryClassification' | 'qualType' | 'qual' | 'qualClassification' | 'subject' | 'ratingMethod' | 'language' | 'proficiencyLevel' | 'gender' | 'maritalStatus' | 'nationality' | 'religion' | 'bloodGroup' | 'relationshipType' | 'attachmentType' | 'currency' | 'membershipType' | 'extracurricularCategory' | 'extracurricularType' | 'geography' | 'benefit';

interface Props {
  entityType: EntityType;
  initialData?: any;
  onClose: (refresh: boolean) => void;
}

export default function EntityModal({ entityType, initialData, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>(initialData || {});
  
  // Reference Data States
  const [corporateTitles, setCorporateTitles] = useState<any[]>([]);
  const [salaryGrades, setSalaryGrades] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [geographies, setGeographies] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);

  useEffect(() => {
    const fetchReferences = async () => {
      try {
        if (entityType === 'designation') {
          const [ctRes, sgRes, deptRes] = await Promise.all([
            eimApi.getCorporateTitles(),
            eimApi.getSalaryGrades(),
            eimApi.getStructures()
          ]);
          setCorporateTitles(ctRes.data || []);
          setSalaryGrades(sgRes.data || []);
          setDepartments((deptRes.data || []).filter((d: any) => d.structureType === 'Department'));
        }
        if (entityType === 'geography') {
          const geoRes = await eimApi.getGeography();
          setGeographies(geoRes.data || []);
        }
        if (entityType === 'location') {
          const cRes = await eimApi.getCompanies();
          setCompanies(cRes.data || []);
        }
        if (entityType === 'department') {
          const [cRes, lRes, ccRes, pRes] = await Promise.all([
            eimApi.getCompanies(),
            eimApi.getLocations(),
            eimApi.getCostCentres(),
            eimApi.getStructures()
          ]);
          setCompanies(cRes.data || []);
          setLocations(lRes.data || []);
          setCostCentres(ccRes.data || []);
          setDepartments(pRes.data || []);
        }
        if (entityType === 'costCentre') {
          const [cRes, pRes] = await Promise.all([
            eimApi.getCompanies(),
            eimApi.getStructures()
          ]);
          setCompanies(cRes.data || []);
          setDepartments((pRes.data || []).filter((d: any) => d.structureType === 'Department'));
        }
      } catch (e) {
        console.error('Failed to load references', e);
      }
    };
    fetchReferences();
  }, [entityType]);

  const titles = {
    company: 'Add Company',
    location: 'Add Location',
    department: 'Add Structure (Hierarchy)',
    designation: 'Add Designation',
    salaryGrade: 'Add Salary Grade',
    costCentre: 'Add Cost Centre',
    corporateTitle: 'Add Corporate Title',
    employmentType: 'Add Employment Type',
    employeeTitle: 'Add Employee Title',
    function: 'Add Function',
    functionalRole: 'Add Functional Role',
    statutoryClassification: 'Add Statutory Classification',
    qualType: 'Add Qualification Type',
    qual: 'Add Qualification',
    qualClassification: 'Add Qualification Classification',
    subject: 'Add Subject',
    ratingMethod: 'Add Rating Method',
    language: 'Add Language',
    proficiencyLevel: 'Add Proficiency Level',
    gender: 'Add Gender',
    maritalStatus: 'Add Marital Status',
    nationality: 'Add Nationality',
    religion: 'Add Religion',
    bloodGroup: 'Add Blood Group',
    relationshipType: 'Add Relationship Type',
    attachmentType: 'Add Attachment Type',
    currency: 'Add Currency',
    membershipType: 'Add Membership Type',
    extracurricularCategory: 'Add Extracurricular Category',
    extracurricularType: 'Add Extracurricular Type',
    geography: 'Add Geographical Info',
    benefit: 'Add Benefit'
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const funcSuffix = entityType.charAt(0).toUpperCase() + entityType.slice(1);
      const isEdit = Boolean(initialData && initialData.id);
      
      let payload = formData;
      if (entityType === 'department') {
        payload = { ...formData, structureType: formData.structureType || 'Department' };
      }
      
      if (isEdit) {
        let updateName = 'update' + funcSuffix;
        if (entityType === 'maritalStatus') updateName = 'updateMaritalStatuse';
        const updateFunc = (eimApi as any)[updateName];
        if (updateFunc) await updateFunc(initialData.id, payload);
      } else {
        let createName = 'create' + funcSuffix;
        if (entityType === 'maritalStatus') createName = 'createMaritalStatuse';
        const createFunc = (eimApi as any)[createName];
        if (createFunc) await createFunc(payload);
      }
      
      onClose(true);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to create entity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{titles[entityType]}</h3>
          <button type="button" onClick={() => onClose(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          
          {entityType === 'designation' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                  <input required type="text" value={formData.code || ''} onChange={e => updateField('code', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input required type="text" value={formData.name || ''} onChange={e => updateField('name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Corporate Title</label>
                  <select value={formData.corporateTitleId || ''} onChange={e => updateField('corporateTitleId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Corporate Title</option>
                    {corporateTitles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salary Grade</label>
                  <select value={formData.salaryGradeId || ''} onChange={e => updateField('salaryGradeId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Salary Grade</option>
                    {salaryGrades.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select value={formData.departmentId || ''} onChange={e => updateField('departmentId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
          
          {entityType === 'costCentre' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                  <select value={formData.companyId || ''} onChange={e => updateField('companyId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Company</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select value={formData.departmentId || ''} onChange={e => updateField('departmentId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {entityType === 'benefit' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Benefit Category</label>
                  <select required value={formData.category || ''} onChange={e => updateField('category', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Category</option>
                    <option value="Cash Benefit">Cash Benefit</option>
                    <option value="Non-cash Benefit Category">Non-cash Benefit Category</option>
                    <option value="Non-cash Benefit">Non-cash Benefit</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={formData.isCash || false} onChange={e => updateField('isCash', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                    Is Cash Benefit?
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Amount</label>
                  <input type="number" step="0.01" value={formData.defaultAmount || ''} onChange={e => updateField('defaultAmount', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <input type="text" value={formData.currency || 'LKR'} onChange={e => updateField('currency', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
            </>
          )}
          
          {entityType === 'geography' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Geography Type</label>
                <select required value={formData.geoType || ''} onChange={e => updateField('geoType', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">Select Level</option>
                  <option value="Country">Country</option>
                  <option value="Province">Province / State</option>
                  <option value="District">District</option>
                  <option value="Division">Division</option>
                  <option value="City">City</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Geography</label>
                <select value={formData.parentId || ''} onChange={e => updateField('parentId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">No Parent</option>
                  {geographies.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {entityType !== 'designation' && entityType !== 'geography' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                <input required type="text" value={formData.code || ''} onChange={e => updateField('code', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required type="text" value={formData.name || ''} onChange={e => updateField('name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
          )}

          {entityType === 'company' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reg Number</label>
                  <input type="text" value={formData.registrationNumber || ''} onChange={e => updateField('registrationNumber', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tax Number</label>
                  <input type="text" value={formData.taxNumber || ''} onChange={e => updateField('taxNumber', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                  <input type="text" value={formData.contactNumber || ''} onChange={e => updateField('contactNumber', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={formData.email || ''} onChange={e => updateField('email', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <input type="text" value={formData.address || ''} onChange={e => updateField('address', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input type="text" value={formData.country || ''} onChange={e => updateField('country', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
            </>
          )}

          {entityType === 'location' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                  <select value={formData.companyId || ''} onChange={e => updateField('companyId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Company...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location Type</label>
                  <select value={formData.locationType || ''} onChange={e => updateField('locationType', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select...</option>
                    <option value="Headquarters">Headquarters</option>
                    <option value="Branch">Branch</option>
                    <option value="Warehouse">Warehouse</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <input type="text" value={formData.address || ''} onChange={e => updateField('address', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input type="text" value={formData.city || ''} onChange={e => updateField('city', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Province/State</label>
                  <input type="text" value={formData.province || ''} onChange={e => updateField('province', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input type="text" value={formData.country || ''} onChange={e => updateField('country', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
            </>
          )}

          {entityType === 'corporateTitle' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Level (Numeric)</label>
                <input required type="number" value={formData.level || ''} onChange={e => updateField('level', parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
          )}

          {entityType === 'department' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Structure Type</label>
                  <select required value={formData.structureType || 'Department'} onChange={e => updateField('structureType', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="Company">Company</option>
                    <option value="Division">Division</option>
                    <option value="Department">Department</option>
                    <option value="Section">Section</option>
                    <option value="Unit">Unit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parent Structure</label>
                  <select value={formData.parentId || ''} onChange={e => updateField('parentId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">No Parent</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                  <select value={formData.companyId || ''} onChange={e => updateField('companyId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Company</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <select value={formData.locationId || ''} onChange={e => updateField('locationId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Location</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {['company', 'department', 'costCentre', 'designation', 'salaryGrade', 'employmentType', 'employeeCategory', 'employeeGroup', 'employeeTitle', 'function', 'functionalRole', 'statutoryClassification', 'benefit'].includes(entityType) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Effective Start Date</label>
                <input type="date" value={formData.effectiveStartDate || ''} onChange={e => updateField('effectiveStartDate', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Effective End Date</label>
                <input type="date" value={formData.effectiveEndDate || ''} onChange={e => updateField('effectiveEndDate', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={() => onClose(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}