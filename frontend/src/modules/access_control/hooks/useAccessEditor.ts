import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api/client';

const message = (error: any, fallback: string) => error.response?.data?.message || error.message || fallback;
export function useAccessEditor(modules: { id: string }[]) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const generation = useRef(0);
  const usersRequest = useRef(0);
  const loadedFor = useRef<string | null>(null);
  const writeInFlight = useRef(false);

  const fetchUsers = async () => {
    const request = ++usersRequest.current;
    setLoading(true); setUsersError('');
    try {
      const { data } = await api.get('/api/access-control/users');
      if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Unable to load users.');
      if (request === usersRequest.current) setUsers(data.data);
    } catch (error) {
      if (request === usersRequest.current) setUsersError(message(error, 'Unable to load users.'));
    } finally { if (request === usersRequest.current) setLoading(false); }
  };
  useEffect(() => {
    void fetchUsers();
    return () => { generation.current++; usersRequest.current++; loadedFor.current = null; };
  }, []);

  const closeEditor = () => {
    if (writeInFlight.current) return;
    generation.current++; loadedFor.current = null;
    setSelectedUser(null); setPermissions([]); setPermissionsError(''); setSaveMsg('');
  };
  const loadPermissions = async (user: any) => {
    const request = ++generation.current;
    loadedFor.current = null;
    setSelectedUser(user); setPermissions([]); setSaveMsg('');
    setPermissionsError(''); setPermissionsLoading(true);
    try {
      const { data } = await api.get(`/api/access-control/users/${user.id}/permissions`);
      if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Unable to load permissions.');
      if (request !== generation.current) return;
      setPermissions(modules.map(m => data.data.find((p: any) => p.moduleId === m.id) || {
        moduleId: m.id, moduleAccess: false, canView: false, canCreate: false,
        canEdit: false, canDelete: false, canApprove: false, canExport: false, dataScope: 'OWN',
      }));
      loadedFor.current = user.id;
    } catch (error) {
      if (request === generation.current) setPermissionsError(message(error, 'Unable to load permissions.'));
    } finally { if (request === generation.current) setPermissionsLoading(false); }
  };
  const handleSave = async () => {
    if (!selectedUser || writeInFlight.current || loadedFor.current !== selectedUser.id || selectedUser.role === 'SUPER_ADMIN') return;
    const request = generation.current;
    writeInFlight.current = true;
    setSaving(true); setSaveMsg('');
    try {
      const { data } = await api.patch(`/api/access-control/users/${selectedUser.id}/permissions`, { permissions });
      if (!data.success) throw new Error(data.message || 'Unable to save permissions.');
      if (request === generation.current) setSaveMsg('✅ Permissions saved!');
    } catch (error) {
      if (request === generation.current) setSaveMsg('❌ ' + message(error, 'Unable to save permissions.'));
    } finally { writeInFlight.current = false; if (request === generation.current) setSaving(false); }
  };
  const toggleStatus = async (isActive: boolean) => {
    if (!selectedUser || writeInFlight.current || selectedUser.role === 'SUPER_ADMIN') return;
    const request = generation.current, id = selectedUser.id;
    writeInFlight.current = true;
    setSaving(true); setSaveMsg('');
    try {
      const { data } = await api.patch(`/api/access-control/users/${id}/status`, { isActive });
      if (!data.success) throw new Error(data.message || 'Unable to change account status.');
      setUsers(current => current.map(u => u.id === id ? { ...u, isActive: isActive ? 1 : 0 } : u));
      if (request === generation.current) setSelectedUser((current: any) => ({ ...current, isActive: isActive ? 1 : 0 }));
    } catch (error) {
      if (request === generation.current) setSaveMsg('❌ ' + message(error, 'Unable to change account status.'));
    } finally { writeInFlight.current = false; if (request === generation.current) setSaving(false); }
  };
  return { users, loading, usersError, fetchUsers, selectedUser, permissions, setPermissions,
    permissionsLoading, permissionsError, saving, saveMsg, closeEditor, loadPermissions, handleSave, toggleStatus };
}
