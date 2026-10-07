import React, { useState, useEffect } from 'react';
import { Edit2, Briefcase, Coins, Award, Plus, Loader2, Trash2 } from 'lucide-react';
import { eimApi } from '../../../lib/api/eimApi';
import EntityModal, { EntityType } from '../EntityModal';

export default function WorkStructure() {
  const [activeTab, setActiveTab] = useState<'salaryGrades' | 'corporateTitles' | 'designations'>('salaryGrades');
  const [activeModal, setActiveModal] = useState<EntityType | null>(null);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  
  const [salaryGrades, setSalaryGrades] = useState<any[]>([]);
  const [corporateTitles, setCorporateTitles] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sgRes, ctRes, desRes] = await Promise.all([
        eimApi.getSalaryGrades(),
        eimApi.getCorporateTitles(),
        eimApi.getDesignations()
      ]);
      setSalaryGrades(sgRes.data.data);
      setCorporateTitles(ctRes.data.data);
      setDesignations(desRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      if (type === 'salaryGrade') await eimApi.deleteSalaryGrade(id);
      if (type === 'corporateTitle') await eimApi.deleteCorporateTitle(id);
      if (type === 'designation') await eimApi.deleteDesignation(id);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete record';
      alert(msg);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tabs = [
    { id: 'salaryGrades', label: 'Salary Grades', icon: Coins },
    { id: 'corporateTitles', label: 'Corporate Titles', icon: Award },
    { id: 'designations', label: 'Designations', icon: Briefcase },
  ] as const;

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center border-b border-slate-200 px-2 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'salaryGrades' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-800">Salary Grades</h3>
                <button onClick={() => (() => { setEditingEntity(null); setActiveModal('salaryGrade'); })()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  <Plus size={16} /> Add Salary Grade
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Min Salary</th><th className="px-4 py-3">Max Salary</th><th className="px-4 py-3">Currency</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salaryGrades.map(sg => (
                      <tr key={sg.id}>
                        <td className="px-4 py-3 font-medium">{sg.code}</td>
                        <td className="px-4 py-3">{sg.name}</td>
                        <td className="px-4 py-3">{sg.gradeLevel}</td>
                        <td className="px-4 py-3">{sg.minSalary}</td>
                        <td className="px-4 py-3">{sg.maxSalary}</td>
                        <td className="px-4 py-3">{sg.currency}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${sg.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{sg.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setEditingEntity(sg); setActiveModal('salaryGrade'); }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete('salaryGrade', sg.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {salaryGrades.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No salary grades found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'corporateTitles' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-800">Corporate Titles</h3>
                <button onClick={() => (() => { setEditingEntity(null); setActiveModal('corporateTitle'); })()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  <Plus size={16} /> Add Corporate Title
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {corporateTitles.map(ct => (
                      <tr key={ct.id}>
                        <td className="px-4 py-3 font-medium">{ct.code}</td>
                        <td className="px-4 py-3">{ct.name}</td>
                        <td className="px-4 py-3">{ct.level}</td>
                        <td className="px-4 py-3">{ct.description || '-'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${ct.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{ct.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setEditingEntity(ct); setActiveModal('corporateTitle'); }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete('corporateTitle', ct.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {corporateTitles.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No corporate titles found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'designations' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-800">Designations</h3>
                <button onClick={() => (() => { setEditingEntity(null); setActiveModal('designation'); })()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  <Plus size={16} /> Add Designation
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {designations.map(d => (
                      <tr key={d.id}>
                        <td className="px-4 py-3 font-medium">{d.code}</td>
                        <td className="px-4 py-3">{d.name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${d.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setEditingEntity(d); setActiveModal('designation'); }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete('designation', d.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {designations.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No designations found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {activeModal && (
        <EntityModal entityType={activeModal} initialData={editingEntity} onClose={(refresh) => { setEditingEntity(null); 
            setActiveModal(null);
            if (refresh) fetchData();
           }} />
      )}
    </div>
  );
}
