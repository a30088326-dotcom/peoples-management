import React, { useState, useEffect } from 'react';
import { Edit2, Building2, MapPin, Network, Banknote, Plus, Search, Loader2, Trash2 } from 'lucide-react';
import { eimApi } from '../../../lib/api/eimApi';
import EntityModal, { EntityType } from '../EntityModal';
import HierarchyTree from './HierarchyTree';
import CompanyHierarchyTab from './hierarchy/CompanyHierarchyTab';

export default function CompanyStructure() {
  const [activeTab, setActiveTab] = useState<'companies' | 'locations' | 'hierarchy' | 'cost_centres'>('companies');
  const [activeModal, setActiveModal] = useState<EntityType | null>(null);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, locRes, structRes, costRes] = await Promise.all([
        eimApi.getCompanies(),
        eimApi.getLocations(),
        eimApi.getStructures(),
        eimApi.getCostCentres()
      ]);
      setCompanies(compRes.data.data);
      setLocations(locRes.data.data);
      setStructures(structRes.data.data);
      setCostCentres(costRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      if (type === 'company') await eimApi.deleteCompany(id);
      if (type === 'location') await eimApi.deleteLocation(id);
      if (type === 'costCentre') await eimApi.deleteCostCentre(id);
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
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'hierarchy', label: 'Company Hierarchy', icon: Network },
    { id: 'cost_centres', label: 'Cost Centres', icon: Banknote },
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
          {activeTab === 'companies' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-800">Companies</h3>
                <button onClick={() => (() => { setEditingEntity(null); setActiveModal('company'); })()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  <Plus size={16} /> Add Company
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Reg No</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companies.map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-medium">{c.code}</td>
                        <td className="px-4 py-3">{c.name}</td>
                        <td className="px-4 py-3">{c.registrationNumber || '-'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setEditingEntity(c); setActiveModal('company'); }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete('company', c.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {companies.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No companies found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-800">Locations</h3>
                <button onClick={() => (() => { setEditingEntity(null); setActiveModal('location'); })()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  <Plus size={16} /> Add Location
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {locations.map(l => (
                      <tr key={l.id}>
                        <td className="px-4 py-3 font-medium">{l.code}</td>
                        <td className="px-4 py-3">{l.name}</td>
                        <td className="px-4 py-3">{l.city || '-'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${l.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{l.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setEditingEntity(l); setActiveModal('location'); }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete('location', l.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {locations.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No locations found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'cost_centres' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-800">Cost Centres</h3>
                <button onClick={() => (() => { setEditingEntity(null); setActiveModal('costCentre'); })()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  <Plus size={16} /> Add Cost Centre
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {costCentres.map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-medium">{c.code}</td>
                        <td className="px-4 py-3">{c.name}</td>
                        <td className="px-4 py-3">{c.description || '-'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setEditingEntity(c); setActiveModal('costCentre'); }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete('costCentre', c.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {costCentres.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No cost centres found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'hierarchy' && (
            <CompanyHierarchyTab />
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
