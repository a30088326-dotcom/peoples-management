import React, { useState, useEffect } from 'react';
import { Edit2, Award, Plus, Loader2, Trash2 } from 'lucide-react';
import { eimApi } from '../../../lib/api/eimApi';
import EntityModal, { EntityType } from '../EntityModal';

const tabs = [{"id":"qualType","label":"Qualification Type"},{"id":"qual","label":"Qualification"},{"id":"qualClassification","label":"Qualification Classification"},{"id":"subject","label":"Subject"},{"id":"ratingMethod","label":"Rating Method"},{"id":"language","label":"Language"},{"id":"proficiencyLevel","label":"Proficiency Level"}];

export default function Qualifications() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [activeModal, setActiveModal] = useState<EntityType | null>(null);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let res;
      
      if (activeTab === 'qualType') res = await eimApi.getQualTypes();
      if (activeTab === 'qual') res = await eimApi.getQuals();
      if (activeTab === 'qualClassification') res = await eimApi.getQualClassifications();
      if (activeTab === 'subject') res = await eimApi.getSubjects();
      if (activeTab === 'ratingMethod') res = await eimApi.getRatingMethods();
      if (activeTab === 'language') res = await eimApi.getLanguages();
      if (activeTab === 'proficiencyLevel') res = await eimApi.getProficiencyLevels();

      setData(res?.data?.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      if (activeTab === 'qualType') await eimApi.deleteQualType(id);
      if (activeTab === 'qual') await eimApi.deleteQual(id);
      if (activeTab === 'qualClassification') await eimApi.deleteQualClassification(id);
      if (activeTab === 'subject') await eimApi.deleteSubject(id);
      if (activeTab === 'ratingMethod') await eimApi.deleteRatingMethod(id);
      if (activeTab === 'language') await eimApi.deleteLanguage(id);
      if (activeTab === 'proficiencyLevel') await eimApi.deleteProficiencyLevel(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete record');
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  return (
    <>
    <div className="@container">
    <div className="flex flex-col @3xl:flex-row gap-6">
      <div className="w-full @3xl:w-64 shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Award size={18} className="text-indigo-600"/> Qualification Definitions</h3>
        </div>
        <div className="p-2 space-y-1 max-h-64 @3xl:max-h-[calc(100vh-280px)] overflow-y-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-slate-800">{tabs.find(t => t.id === activeTab)?.label}</h3>
          <button onClick={() => setActiveModal(activeTab as EntityType)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
            <Plus size={16} /> Add New
          </button>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th>
                
                
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((d: any) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium">{d.code}</td>
                    <td className="px-4 py-3">{d.name}</td>
                    
                    
                    <td className="px-4 py-3 truncate max-w-xs">{d.description || "-"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${d.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditingEntity(d); setActiveModal(activeTab as EntityType); }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(d.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No records found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
    </div>
      {activeModal && <EntityModal entityType={activeModal} initialData={editingEntity} onClose={(r) => { setEditingEntity(null);  setActiveModal(null); if (r) fetchData();  }} />}
    </>
  );
}
