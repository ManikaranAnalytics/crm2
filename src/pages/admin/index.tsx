import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import {
  CAN_MANAGE_QUERIES,
  CAN_MANAGE_CLIENTS,
  type RoleName,
} from '../../lib/auth/roles';
import { useAuth } from '../_app';

const CAN_MANAGE_MASTER_PSS: RoleName[] = ['ADMIN', 'GM', 'MANAGER'];

interface MasterPssItem {
  id: number;
  name: string;
  utility: string | null;
  state: string | null;
  capacityMw: number | null;
  type: string | null;
  technology: string | null;
  transmissionType: 'STU' | 'CTU' | null;
}

interface RoleRecord {
  id: number;
  name: RoleName;
}

interface DbOverview {
  roles: number;
  users: number;
  clients: number;
  client_pss: number;
  queries: number;
  requests: number;
  attachments: number;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  rank: number;
  isActive: boolean;
  roleName: RoleName;
}

interface ClientSummary {
  id: number;
  name: string;
  state: string | null;
  isApproved: boolean;
  pssCount: number;
}

interface ClientPssItem {
  id: number;
  clientId: number;
  name: string;
  state: string | null;
  capacityMw: number | null;
	  technology: string | null;
	  transmissionType: 'STU' | 'CTU' | null;
}


	const AdminPage: React.FC = () => {
	  const { user } = useAuth();
	  const canManageMasterPss = !!user && CAN_MANAGE_MASTER_PSS.includes(user.role as RoleName);
	  const [roles, setRoles] = useState<RoleRecord[]>([]);
	  const [dbOverview, setDbOverview] = useState<DbOverview | null>(null);
	  const [users, setUsers] = useState<AdminUser[]>([]);
	  const [clients, setClients] = useState<ClientSummary[]>([]);
	  const [clientPss, setClientPss] = useState<ClientPssItem[]>([]);
	  const [masterPss, setMasterPss] = useState<MasterPssItem[]>([]);
	  const [masterSearch, setMasterSearch] = useState('');
	  const [editingMasterId, setEditingMasterId] = useState<number | null>(null);
	  const [editMaster, setEditMaster] = useState<MasterPssItem | null>(null);
	  const [newMaster, setNewMaster] = useState({
	    name: '',
	    utility: '',
	    state: '',
	    capacityMw: '',
	    type: '',
	    technology: '',
	    transmissionType: '' as 'STU' | 'CTU' | '',
	  });
	  const [masterMessage, setMasterMessage] = useState<string | null>(null);
	  const [loading, setLoading] = useState(true);
	  const [error, setError] = useState<string | null>(null);
	
	  const [editingUserId, setEditingUserId] = useState<number | null>(null);
	  const [editUser, setEditUser] = useState<AdminUser | null>(null);
	  const [editingClientId, setEditingClientId] = useState<number | null>(null);
	  const [editClient, setEditClient] = useState<ClientSummary | null>(null);
	  const [editingPssId, setEditingPssId] = useState<number | null>(null);
	  const [editPss, setEditPss] = useState<ClientPssItem | null>(null);
	
	  const [newRole, setNewRole] = useState({
    name: '' as RoleName,
  });

  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    roleName: '' as RoleName,
    rank: 3,
  });

  const [newClient, setNewClient] = useState({
    name: '',
    state: '',
  });

	  const [newPss, setNewPss] = useState({
	    clientId: '',
	    name: '',
	    state: '',
	    capacityMw: '',
	    technology: '',
	    transmissionType: '',
	  });

  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rolesRes, dbRes, usersRes, clientsRes, pssRes, masterRes] = await Promise.all([
          fetch('/api/admin/roles'),
          fetch('/api/admin/db-overview'),
          fetch('/api/admin/users'),
          fetch('/api/admin/clients'),
          fetch('/api/admin/client-pss'),
          fetch('/api/pss-master'),
        ]);

        if (!rolesRes.ok) {
          const body = await rolesRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load roles');
        }
        if (!dbRes.ok) {
          const body = await dbRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load DB overview');
        }
        if (!usersRes.ok) {
          const body = await usersRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load users');
        }
        if (!clientsRes.ok) {
          const body = await clientsRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load clients');
        }
        if (!pssRes.ok) {
          const body = await pssRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load PSS entries');
        }

	        const rolesData = await rolesRes.json();
	        const dbData = await dbRes.json();
	        const usersData = await usersRes.json();
	        const clientsData = await clientsRes.json();
	        const pssData = await pssRes.json();
	        const masterData = masterRes.ok ? await masterRes.json() : { pss: [] };

        const rolesList: RoleRecord[] = rolesData.roles || [];
        setRoles(rolesList);
        if (rolesList.length > 0) {
          setNewUser((prev) => ({
            ...prev,
            roleName: (prev.roleName || rolesList[0].name) as RoleName,
          }));
        }
	        setDbOverview(dbData || null);
	        setUsers(usersData.users || []);
	        setClients(clientsData.clients || []);
	        setClientPss(pssData.pss || []);
	        setMasterPss(masterData.pss || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);


  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = newRole.name.trim();
    if (!trimmedName) {
      setError('Role name is required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create role');
      }
      const body = await res.json();
      setRoles((prev) => [...prev, body.role]);
      setNewRole({ name: '' as RoleName });
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    }
  };

  const handleDeleteRole = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/roles?id=${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete role');
      }
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newUser.email || !newUser.name || !newUser.password || !newUser.roleName) {
      setError('Email, name, password, and role are required for new users.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          name: newUser.name,
          password: newUser.password,
          roleName: newUser.roleName,
          rank: newUser.rank,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create user');
      }
      const body = await res.json();
      setUsers((prev) => [...prev, body.user as AdminUser]);
      setNewUser({
        email: '',
        name: '',
        password: '',
        roleName: (roles[0]?.name || '') as RoleName,
        rank: 3,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete user');
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

	  const startEditUser = (user: AdminUser) => {
	    setError(null);
	    setEditingUserId(user.id);
	    setEditUser({ ...user });
	  };

	  const cancelEditUser = () => {
	    setEditingUserId(null);
	    setEditUser(null);
	  };

	  const handleUpdateUserField = (field: keyof AdminUser, value: any) => {
	    setEditUser((prev) => (prev ? { ...prev, [field]: value } : prev));
	  };

	  const handleSaveUser = async () => {
	    if (!editUser) return;
	    setError(null);
	    try {
	      const res = await fetch('/api/admin/users', {
	        method: 'PATCH',
	        headers: { 'Content-Type': 'application/json' },
	        body: JSON.stringify({
	          id: editUser.id,
	          email: editUser.email,
	          name: editUser.name,
	          roleName: editUser.roleName,
	          rank: editUser.rank,
	          isActive: editUser.isActive,
	        }),
	      });
	      if (!res.ok) {
	        const body = await res.json().catch(() => ({}));
	        throw new Error(body.error || 'Failed to update user');
	      }
	      const body = await res.json();
	      const updated: AdminUser = body.user;
	      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
	      setEditingUserId(null);
	      setEditUser(null);
	    } catch (err: any) {
	      setError(err.message || 'Failed to update user');
	    }
	  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newClient.name) {
      setError('Client name is required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClient.name,
          state: newClient.state || null,
          isApproved: false,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create client');
      }
      const body = await res.json();
      setClients((prev) => [...prev, body.client as ClientSummary]);
      setNewClient({ name: '', state: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    }
  };

  const handleToggleClientApproval = async (client: ClientSummary) => {
    setError(null);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          isApproved: !client.isApproved,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update client');
      }
      const body = await res.json();
      const updated: ClientSummary = body.client;
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: any) {
      setError(err.message || 'Failed to update client');
    }
  };

  const handleDeleteClient = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients?id=${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete client');
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
      setClientPss((prev) => prev.filter((p) => p.clientId !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete client');
    }
  };

	  const startEditClient = (client: ClientSummary) => {
	    setError(null);
	    setEditingClientId(client.id);
	    setEditClient({ ...client });
	  };

	  const cancelEditClient = () => {
	    setEditingClientId(null);
	    setEditClient(null);
	  };

	  const handleUpdateClientField = (field: keyof ClientSummary, value: any) => {
	    setEditClient((prev) => (prev ? { ...prev, [field]: value } : prev));
	  };

	  const handleSaveClient = async () => {
	    if (!editClient) return;
	    setError(null);
	    try {
	      const res = await fetch('/api/admin/clients', {
	        method: 'PATCH',
	        headers: { 'Content-Type': 'application/json' },
	        body: JSON.stringify({
	          id: editClient.id,
	          name: editClient.name,
	          state: editClient.state,
	          isApproved: editClient.isApproved,
	        }),
	      });
	      if (!res.ok) {
	        const body = await res.json().catch(() => ({}));
	        throw new Error(body.error || 'Failed to update client');
	      }
	      const body = await res.json();
	      const updated: ClientSummary = body.client;
	      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
	      setEditingClientId(null);
	      setEditClient(null);
	    } catch (err: any) {
	      setError(err.message || 'Failed to update client');
	    }
	  };

  const handleCreatePss = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPss.clientId || !newPss.name) {
      setError('Client and PSS name are required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/client-pss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: Number(newPss.clientId),
          name: newPss.name,
          state: newPss.state || null,
          capacityMw: newPss.capacityMw || null,
          technology: newPss.technology || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create PSS');
      }
      const body = await res.json();
      setClientPss((prev) => [...prev, body.pss as ClientPssItem]);
	      setNewPss({
	        clientId: '',
	        name: '',
	        state: '',
	        capacityMw: '',
	        technology: '',
	        transmissionType: '',
	      });
    } catch (err: any) {
      setError(err.message || 'Failed to create PSS');
    }
  };

  const handleDeletePss = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/client-pss?id=${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete PSS');
      }
      setClientPss((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete PSS');
    }
  };

	  const startEditPss = (pss: ClientPssItem) => {
	    setError(null);
	    setEditingPssId(pss.id);
	    setEditPss({ ...pss });
	  };

	  const cancelEditPss = () => {
	    setEditingPssId(null);
	    setEditPss(null);
	  };

	  const handleUpdatePssField = (field: keyof ClientPssItem, value: any) => {
	    setEditPss((prev) => (prev ? { ...prev, [field]: value } : prev));
	  };

	  const handleSavePss = async () => {
	    if (!editPss) return;
	    setError(null);
	    try {
	      const res = await fetch('/api/admin/client-pss', {
	        method: 'PATCH',
	        headers: { 'Content-Type': 'application/json' },
	        body: JSON.stringify({
	          id: editPss.id,
	          name: editPss.name,
	          state: editPss.state,
	          capacityMw:
	            editPss.capacityMw === null || editPss.capacityMw === undefined
	              ? ''
	              : String(editPss.capacityMw),
	          technology: editPss.technology,
	          transmissionType: editPss.transmissionType,
	        }),
	      });
	      if (!res.ok) {
	        const body = await res.json().catch(() => ({}));
	        throw new Error(body.error || 'Failed to update PSS');
	      }
	      const body = await res.json();
	      const updated: ClientPssItem = body.pss;
	      setClientPss((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
	      setEditingPssId(null);
	      setEditPss(null);
	    } catch (err: any) {
	      setError(err.message || 'Failed to update PSS');
	    }
	  };

  const getClientName = (clientId: number) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : `Client #${clientId}`;
  };

  const filteredMasterPss = useMemo(() => {
    const q = masterSearch.trim().toLowerCase();
    if (!q) return masterPss;
    return masterPss.filter((p) =>
      [p.name, p.state, p.utility, p.type, p.technology, p.transmissionType]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [masterPss, masterSearch]);

  const startEditMaster = (item: MasterPssItem) => {
    setError(null);
    setMasterMessage(null);
    setEditingMasterId(item.id);
    setEditMaster({ ...item });
  };

  const cancelEditMaster = () => {
    setEditingMasterId(null);
    setEditMaster(null);
  };

  const handleUpdateMasterField = (field: keyof MasterPssItem, value: any) => {
    setEditMaster((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveMaster = async () => {
    if (!editMaster) return;
    setError(null);
    setMasterMessage(null);
    try {
      const res = await fetch('/api/pss-master', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editMaster.id,
          name: editMaster.name,
          utility: editMaster.utility,
          state: editMaster.state,
          capacityMw:
            editMaster.capacityMw === null || editMaster.capacityMw === undefined
              ? ''
              : String(editMaster.capacityMw),
          type: editMaster.type,
          technology: editMaster.technology,
          transmissionType: editMaster.transmissionType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update master PSS');
      }
      const body = await res.json();
      const updated: MasterPssItem = body.pss;
      setMasterPss((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingMasterId(null);
      setEditMaster(null);
      setMasterMessage('PSS updated');
    } catch (err: any) {
      setError(err.message || 'Failed to update master PSS');
    }
  };

  const handleDeleteMaster = async (id: number) => {
    setError(null);
    setMasterMessage(null);
    try {
      const res = await fetch(`/api/pss-master?id=${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete master PSS');
      }
      setMasterPss((prev) => prev.filter((p) => p.id !== id));
      setMasterMessage('PSS removed');
    } catch (err: any) {
      setError(err.message || 'Failed to delete master PSS');
    }
  };

  const handleCreateMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMasterMessage(null);
    if (!newMaster.name.trim()) {
      setError('PSS name is required.');
      return;
    }
    try {
      const res = await fetch('/api/pss-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMaster.name.trim(),
          utility: newMaster.utility || null,
          state: newMaster.state || null,
          capacityMw: newMaster.capacityMw || null,
          type: newMaster.type || null,
          technology: newMaster.technology || null,
          transmissionType: newMaster.transmissionType || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create master PSS');
      }
      const body = await res.json();
      setMasterPss((prev) => [...prev, body.pss as MasterPssItem]);
      setNewMaster({
        name: '',
        utility: '',
        state: '',
        capacityMw: '',
        type: '',
        technology: '',
        transmissionType: '',
      });
      setMasterMessage('PSS added');
    } catch (err: any) {
      setError(err.message || 'Failed to create master PSS');
    }
  };

  const handleReimportMaster = async () => {
    setError(null);
    setMasterMessage(null);
    try {
      const res = await fetch('/api/pss-master?mode=reimport', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to re-import from Excel');
      }
      const body = await res.json();
      const listRes = await fetch('/api/pss-master');
      const listBody = listRes.ok ? await listRes.json() : { pss: [] };
      setMasterPss(listBody.pss || []);
      setMasterMessage(`Imported ${body.inserted ?? 0} new PSS from Excel.`);
    } catch (err: any) {
      setError(err.message || 'Failed to re-import from Excel');
    }
  };

  const filteredPss = selectedClientId
    ? clientPss.filter((p) => p.clientId === Number(selectedClientId))
    : clientPss;


  const permissions = [
    {
      key: 'Manage queries',
      allowedRoles: CAN_MANAGE_QUERIES,
    },
    {
      key: 'Manage clients',
      allowedRoles: CAN_MANAGE_CLIENTS,
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Admin</h2>
          <p className="mt-1 text-sm text-slate-500">
            Inspect permissions, see database tables, and manage roles, users, clients, and PSS mappings.
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Role-based permissions</h3>
          <p className="mt-1 text-xs text-slate-500">
            Derived from <code className="rounded bg-slate-100 px-1">lib/auth/roles.ts</code> and the roles you
            have created below.
          </p>
          {roles.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No roles defined yet. Create roles in the section below to see the permission matrix.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Permission</th>
                    {roles.map((role) => (
                      <th key={role.id} className="px-3 py-2 font-medium">
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr key={perm.key} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 text-slate-700">{perm.key}</td>
                      {roles.map((role) => {
                        const enabled = perm.allowedRoles.includes(role.name as RoleName);
                        return (
                          <td key={role.id} className="px-3 py-2">
                            <span
                              className={
                                enabled
                                  ? 'inline-flex rounded-full bg-teal-50 px-2 text-xs font-medium text-teal-700'
                                  : 'inline-flex rounded-full bg-slate-50 px-2 text-xs font-medium text-slate-400'
                              }
                            >
                              {enabled ? 'Yes' : 'No'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Database tables</h3>
            <p className="mt-1 text-xs text-slate-500">High-level overview of key tables.</p>
            {loading && !dbOverview ? (
              <p className="mt-3 text-sm text-slate-500">Loading DB overview hellip;</p>
            ) : dbOverview ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {Object.entries(dbOverview).map(([key, value]) => (
                  <div key={key} className="rounded-md bg-slate-50 px-3 py-2">
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">{key}</dt>
                    <dd className="text-base font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No data yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Roles</h3>
            <p className="mt-1 text-xs text-slate-500">
              Manage which roles are available. These are used when assigning roles to users.
            </p>

            <div className="mt-4 space-y-3">
              {roles.length === 0 && !loading && (
                <p className="text-sm text-slate-500">No roles defined yet. Use the form below to add one.</p>
              )}
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <div className="font-medium text-slate-900">{role.name}</div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRole(role.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleCreateRole}
              className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="role-name">
                  Role name
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={newRole.name}
                  onChange={(e) =>
                    setNewRole((prev) => ({ ...prev, name: e.target.value as RoleName }))
                  }
                  placeholder="e.g. ADMIN, MANAGER, GM"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
                >
                  Add role
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Users</h3>
              <p className="mt-1 text-xs text-slate-500">
                View and manage user accounts, roles, and ranks.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto text-sm">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Rank</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
	                {users.map((user) => {
	                  const isEditing = editingUserId === user.id;
	                  const current = isEditing && editUser ? editUser : user;
	                  return (
	                    <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
	                      <td className="px-3 py-2">
	                        {isEditing ? (
	                          <input
	                            type="email"
	                            value={current.email}
	                            onChange={(e) => handleUpdateUserField('email', e.target.value)}
	                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                          />
	                        ) : (
	                          user.email
	                        )}
	                      </td>
	                      <td className="px-3 py-2">
	                        {isEditing ? (
	                          <input
	                            type="text"
	                            value={current.name}
	                            onChange={(e) => handleUpdateUserField('name', e.target.value)}
	                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                          />
	                        ) : (
	                          user.name
	                        )}
	                      </td>
	                      <td className="px-3 py-2">
	                        {isEditing ? (
	                          <select
	                            value={current.roleName}
	                            onChange={(e) =>
	                              handleUpdateUserField('roleName', e.target.value as RoleName)
	                            }
	                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                          >
	                            {roles.map((r) => (
	                              <option key={r.id} value={r.name}>
	                                {r.name}
	                              </option>
	                            ))}
	                          </select>
	                        ) : (
	                          user.roleName
	                        )}
	                      </td>
	                      <td className="px-3 py-2">
	                        {isEditing ? (
	                          <input
	                            type="number"
	                            min={1}
	                            step={1}
	                            value={current.rank}
	                            onChange={(e) =>
	                              handleUpdateUserField('rank', Number(e.target.value) || 1)
	                            }
	                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                          />
	                        ) : (
	                          user.rank
	                        )}
	                      </td>
	                      <td className="px-3 py-2">
	                        {isEditing ? (
	                          <select
	                            value={current.isActive ? 'true' : 'false'}
	                            onChange={(e) =>
	                              handleUpdateUserField('isActive', e.target.value === 'true')
	                            }
	                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                          >
	                            <option value="true">Yes</option>
	                            <option value="false">No</option>
	                          </select>
	                        ) : (
	                          <span
	                            className={
	                              user.isActive
	                                ? 'inline-flex rounded-full bg-teal-50 px-2 text-xs font-medium text-teal-700'
	                                : 'inline-flex rounded-full bg-slate-50 px-2 text-xs font-medium text-slate-400'
	                            }
	                          >
	                            {user.isActive ? 'Yes' : 'No'}
	                          </span>
	                        )}
	                      </td>
	                      <td className="px-3 py-2 text-right space-x-2">
	                        {isEditing ? (
	                          <>
	                            <button
	                              type="button"
	                              onClick={handleSaveUser}
	                              className="text-xs font-medium text-teal-700 hover:text-teal-800"
	                            >
	                              Save
	                            </button>
	                            <button
	                              type="button"
	                              onClick={cancelEditUser}
	                              className="text-xs font-medium text-slate-600 hover:text-slate-700"
	                            >
	                              Cancel
	                            </button>
	                          </>
	                        ) : (
	                          <>
	                            <button
	                              type="button"
	                              onClick={() => startEditUser(user)}
	                              className="text-xs font-medium text-slate-600 hover:text-slate-700"
	                            >
	                              Edit
	                            </button>
	                            <button
	                              type="button"
	                              onClick={() => handleDeleteUser(user.id)}
	                              className="text-xs font-medium text-red-600 hover:text-red-700"
	                            >
	                              Remove
	                            </button>
	                          </>
	                        )}
	                      </td>
	                    </tr>
	                  );
	                })}
                {users.length === 0 && !loading && (
                  <tr>
                    <td className="px-3 py-2 text-sm text-slate-500" colSpan={6}>
                      No users yet. Use the form below to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form
            onSubmit={handleCreateUser}
            className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm"
          >
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="user-email">
                  Email
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="user-name">
                  Name
                </label>
                <input
                  id="user-name"
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium text-slate-600"
                  htmlFor="user-password"
                >
                  Password
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="user-role">
                  Role
                </label>
                <select
                  id="user-role"
                  value={newUser.roleName}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, roleName: e.target.value as RoleName }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="user-rank">
                  Rank
                </label>
                <input
                  id="user-rank"
                  type="number"
                  min={1}
                  step={1}
                  value={newUser.rank}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, rank: Number(e.target.value) || 1 }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                Add user
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Clients</h3>
              <p className="mt-1 text-xs text-slate-500">
                Approve clients and see how many PSS entries are linked to each.
              </p>

	              <div className="mt-3 overflow-x-auto text-sm">
	                <table className="min-w-full text-left">
	                  <thead className="border-b border-slate-200 bg-slate-50 text-sm uppercase text-slate-500">
	                    <tr>
	                      <th className="px-3 py-2 font-medium">Name</th>
	                      <th className="px-3 py-2 font-medium">State</th>
	                      <th className="px-3 py-2 font-medium">PSS</th>
	                      <th className="px-3 py-2 font-medium">Approved</th>
	                      <th className="px-3 py-2 font-medium text-right">Actions</th>
	                    </tr>
	                  </thead>
	                  <tbody>
	                    {clients.map((client) => {
	                      const isEditing = editingClientId === client.id;
	                      const current = isEditing && editClient ? editClient : client;
	                      return (
	                        <tr key={client.id} className="border-b border-slate-100 last:border-b-0">
	                          <td className="px-3 py-2">
	                            {isEditing ? (
	                              <input
	                                type="text"
	                                value={current.name}
	                                onChange={(e) => handleUpdateClientField('name', e.target.value)}
	                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                              />
	                            ) : (
	                              client.name
	                            )}
	                          </td>
	                          <td className="px-3 py-2">
	                            {isEditing ? (
	                              <input
	                                type="text"
	                                value={current.state ?? ''}
	                                onChange={(e) => handleUpdateClientField('state', e.target.value)}
	                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                              />
	                            ) : (
	                              client.state || '-'
	                            )}
	                          </td>
	                          <td className="px-3 py-2">{client.pssCount}</td>
	                          <td className="px-3 py-2">
	                            {isEditing ? (
	                              <select
	                                value={current.isApproved ? 'true' : 'false'}
	                                onChange={(e) =>
	                                  handleUpdateClientField('isApproved', e.target.value === 'true')
	                                }
	                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                              >
	                                <option value="true">Yes</option>
	                                <option value="false">No</option>
	                              </select>
	                            ) : (
	                              <span
	                                className={
	                                  client.isApproved
	                                    ? 'inline-flex rounded-full bg-teal-50 px-2 text-xs font-medium text-teal-700'
	                                    : 'inline-flex rounded-full bg-slate-50 px-2 text-xs font-medium text-slate-400'
	                                }
	                              >
	                                {client.isApproved ? 'Yes' : 'No'}
	                              </span>
	                            )}
	                          </td>
	                          <td className="px-3 py-2 space-x-2 text-right">
	                            {isEditing ? (
	                              <>
	                                <button
	                                  type="button"
	                                  onClick={handleSaveClient}
	                                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
	                                >
	                                  Save
	                                </button>
	                                <button
	                                  type="button"
	                                  onClick={cancelEditClient}
	                                  className="text-xs font-medium text-slate-600 hover:text-slate-700"
	                                >
	                                  Cancel
	                                </button>
	                              </>
	                            ) : (
	                              <>
	                                <button
	                                  type="button"
	                                  onClick={() => handleToggleClientApproval(client)}
	                                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
	                                >
	                                  {client.isApproved ? 'Revoke' : 'Approve'}
	                                </button>
	                                <button
	                                  type="button"
	                                  onClick={() => startEditClient(client)}
	                                  className="text-xs font-medium text-slate-600 hover:text-slate-700"
	                                >
	                                  Edit
	                                </button>
	                                <button
	                                  type="button"
	                                  onClick={() => handleDeleteClient(client.id)}
	                                  className="text-xs font-medium text-red-600 hover:text-red-700"
	                                >
	                                  Remove
	                                </button>
	                              </>
	                            )}
	                          </td>
	                        </tr>
	                      );
	                    })}
	                    {clients.length === 0 && !loading && (
	                      <tr>
	                        <td className="px-3 py-2 text-sm text-slate-500" colSpan={5}>
	                          No clients yet. Use the form below to add one.
	                        </td>
	                      </tr>
	                    )}
	                  </tbody>
	                </table>
	              </div>

              <details className="mt-4 border-t border-slate-200 pt-2 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-teal-700">
                  Add client
                </summary>
                <form onSubmit={handleCreateClient} className="mt-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600" htmlFor="client-name">
                        Name
                      </label>
                      <input
                        id="client-name"
                        type="text"
                        value={newClient.name}
                        onChange={(e) =>
                          setNewClient((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600" htmlFor="client-state">
                        State
                      </label>
                      <input
                        id="client-state"
                        type="text"
                        value={newClient.state}
                        onChange={(e) =>
                          setNewClient((prev) => ({ ...prev, state: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
                    >
                      Add client
                    </button>
                  </div>
                </form>
              </details>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">PSS mappings</h3>
              <p className="mt-1 text-xs text-slate-500">
                Manage PSS entries and link them to clients.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <label className="text-slate-600" htmlFor="pss-client-filter">
                  Filter by client:
                </label>
                <select
                  id="pss-client-filter"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">All clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 overflow-x-auto text-sm">
                <table className="min-w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50 text-sm uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
	                      <th className="px-3 py-2 font-medium">Client</th>
	                      <th className="px-3 py-2 font-medium">State</th>
	                      <th className="px-3 py-2 font-medium">Capacity (MW)</th>
	                      <th className="px-3 py-2 font-medium">Technology</th>
	                      <th className="px-3 py-2 font-medium">Transmission</th>
	                      <th className="px-3 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
	                  <tbody>
	                    {filteredPss.map((pss) => {
	                      const isEditing = editingPssId === pss.id;
	                      const current = isEditing && editPss ? editPss : pss;
	                      return (
	                        <tr key={pss.id} className="border-b border-slate-100 last:border-b-0">
	                          <td className="px-3 py-2">
	                            {isEditing ? (
	                              <input
	                                type="text"
	                                value={current.name}
	                                onChange={(e) => handleUpdatePssField('name', e.target.value)}
	                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                              />
	                            ) : (
	                              pss.name
	                            )}
	                          </td>
	                          <td className="px-3 py-2">{getClientName(pss.clientId)}</td>
	                          <td className="px-3 py-2">
	                            {isEditing ? (
	                              <input
	                                type="text"
	                                value={current.state ?? ''}
	                                onChange={(e) => handleUpdatePssField('state', e.target.value)}
	                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                              />
	                            ) : (
	                              pss.state || '-'
	                            )}
	                          </td>
	                          <td className="px-3 py-2">
	                            {isEditing ? (
	                              <input
	                                type="number"
	                                step="0.01"
	                                value={current.capacityMw ?? ''}
	                                onChange={(e) =>
	                                  handleUpdatePssField(
	                                    'capacityMw',
	                                    e.target.value === '' ? null : Number(e.target.value),
	                                  )
	                                }
	                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                              />
	                            ) : pss.capacityMw == null ? (
	                              '-'
	                            ) : (
	                              pss.capacityMw.toLocaleString()
	                            )}
	                          </td>
	                          <td className="px-3 py-2">
	                            {isEditing ? (
	                              <input
	                                type="text"
	                                value={current.technology ?? ''}
	                                onChange={(e) =>
	                                  handleUpdatePssField('technology', e.target.value || null)
	                                }
	                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                              />
	                            ) : (
	                              pss.technology || '-'
	                            )}
	                          </td>
	                          <td className="px-3 py-2">
	                            {isEditing ? (
	                              <select
	                                value={current.transmissionType ?? ''}
	                                onChange={(e) =>
	                                  handleUpdatePssField(
	                                    'transmissionType',
	                                    e.target.value === ''
	                                      ? null
	                                      : (e.target.value as 'STU' | 'CTU'),
	                                  )
	                                }
	                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                              >
	                                <option value="">-</option>
	                                <option value="STU">STU</option>
	                                <option value="CTU">CTU</option>
	                              </select>
	                            ) : (
	                              pss.transmissionType || '-'
	                            )}
	                          </td>
	                          <td className="px-3 py-2 text-right space-x-2">
	                            {isEditing ? (
	                              <>
	                                <button
	                                  type="button"
	                                  onClick={handleSavePss}
	                                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
	                                >
	                                  Save
	                                </button>
	                                <button
	                                  type="button"
	                                  onClick={cancelEditPss}
	                                  className="text-xs font-medium text-slate-600 hover:text-slate-700"
	                                >
	                                  Cancel
	                                </button>
	                              </>
	                            ) : (
	                              <>
	                                <button
	                                  type="button"
	                                  onClick={() => startEditPss(pss)}
	                                  className="text-xs font-medium text-slate-600 hover:text-slate-700"
	                                >
	                                  Edit
	                                </button>
	                                <button
	                                  type="button"
	                                  onClick={() => handleDeletePss(pss.id)}
	                                  className="text-xs font-medium text-red-600 hover:text-red-700"
	                                >
	                                  Remove
	                                </button>
	                              </>
	                            )}
	                          </td>
	                        </tr>
	                      );
	                    })}
	                    {filteredPss.length === 0 && !loading && (
	                      <tr>
	                        <td className="px-3 py-2 text-sm text-slate-500" colSpan={7}>
	                          No PSS entries yet. Use the form below to add one.
	                        </td>
	                      </tr>
	                    )}
	                  </tbody>
                </table>
              </div>

              <details className="mt-4 border-t border-slate-200 pt-2 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-teal-700">
                  Add PSS
                </summary>
                <form onSubmit={handleCreatePss} className="mt-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600" htmlFor="pss-client">
                        Client
                      </label>
                      <select
                        id="pss-client"
                        value={newPss.clientId}
                        onChange={(e) =>
                          setNewPss((prev) => ({ ...prev, clientId: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="">Select client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600" htmlFor="pss-name">
                        Name
                      </label>
                      <input
                        id="pss-name"
                        type="text"
                        value={newPss.name}
                        onChange={(e) =>
                          setNewPss((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600" htmlFor="pss-state">
                        State
                      </label>
                      <input
                        id="pss-state"
                        type="text"
                        value={newPss.state}
                        onChange={(e) =>
                          setNewPss((prev) => ({ ...prev, state: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
	                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <label
                        className="block text-xs font-medium text-slate-600"
                        htmlFor="pss-capacity"
                      >
                        Capacity (MW)
                      </label>
                      <input
                        id="pss-capacity"
                        type="number"
                        step="0.01"
                        value={newPss.capacityMw}
                        onChange={(e) =>
                          setNewPss((prev) => ({ ...prev, capacityMw: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs font-medium text-slate-600"
                        htmlFor="pss-technology"
                      >
                        Technology
                      </label>
                      <input
                        id="pss-technology"
                        type="text"
                        value={newPss.technology}
                        onChange={(e) =>
                          setNewPss((prev) => ({ ...prev, technology: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
	                    <div>
	                      <label
	                        className="block text-xs font-medium text-slate-600"
	                        htmlFor="pss-transmission"
	                      >
	                        Transmission type
	                      </label>
	                      <select
	                        id="pss-transmission"
	                        value={newPss.transmissionType}
	                        onChange={(e) =>
	                          setNewPss((prev) => ({
	                            ...prev,
	                            transmissionType: e.target.value as 'STU' | 'CTU' | '',
	                          }))
	                        }
	                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
	                      >
	                        <option value="">Select</option>
	                        <option value="STU">STU</option>
	                        <option value="CTU">CTU</option>
	                      </select>
	                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
                    >
                      Add PSS
                    </button>
                  </div>
                </form>
              </details>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Master PSS list</h3>
              <p className="mt-1 text-xs text-slate-500">
                Shared PSS catalog used by the &quot;Add query&quot; page. Seeded from
                <code className="mx-1 rounded bg-slate-100 px-1">Copy of All PSS.xlsx</code>.
                {canManageMasterPss
                  ? ' Managers can add, edit, and remove entries.'
                  : ' Managers can edit this list.'}
              </p>
            </div>
            {canManageMasterPss && (
              <button
                type="button"
                onClick={handleReimportMaster}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Re-import from Excel
              </button>
            )}
          </div>

          {masterMessage && (
            <p className="mt-3 rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-700">
              {masterMessage}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <label className="text-slate-600" htmlFor="master-search">
              Search:
            </label>
            <input
              id="master-search"
              type="text"
              value={masterSearch}
              onChange={(e) => setMasterSearch(e.target.value)}
              placeholder="Name, state, utility, type…"
              className="w-64 rounded-md border border-slate-300 px-2 py-1 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <span className="text-slate-500">
              Showing {filteredMasterPss.length} of {masterPss.length}
            </span>
          </div>

          <div className="mt-3 overflow-x-auto text-sm">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Utility</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Capacity (MW)</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Technology</th>
                  <th className="px-3 py-2 font-medium">Transmission</th>
                  {canManageMasterPss && <th className="px-3 py-2 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMasterPss.slice(0, 500).map((item) => {
                  const isEditing = editingMasterId === item.id;
                  const current = isEditing && editMaster ? editMaster : item;
                  return (
                    <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={current.name}
                            onChange={(e) => handleUpdateMasterField('name', e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={current.utility ?? ''}
                            onChange={(e) => handleUpdateMasterField('utility', e.target.value || null)}
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        ) : (
                          item.utility || '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={current.state ?? ''}
                            onChange={(e) => handleUpdateMasterField('state', e.target.value || null)}
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        ) : (
                          item.state || '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={current.capacityMw ?? ''}
                            onChange={(e) =>
                              handleUpdateMasterField(
                                'capacityMw',
                                e.target.value === '' ? null : Number(e.target.value),
                              )
                            }
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        ) : item.capacityMw == null ? (
                          '-'
                        ) : (
                          item.capacityMw.toLocaleString()
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={current.type ?? ''}
                            onChange={(e) => handleUpdateMasterField('type', e.target.value || null)}
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        ) : (
                          item.type || '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={current.technology ?? ''}
                            onChange={(e) => handleUpdateMasterField('technology', e.target.value || null)}
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        ) : (
                          item.technology || '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <select
                            value={current.transmissionType ?? ''}
                            onChange={(e) =>
                              handleUpdateMasterField(
                                'transmissionType',
                                e.target.value === '' ? null : (e.target.value as 'STU' | 'CTU'),
                              )
                            }
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          >
                            <option value="">-</option>
                            <option value="STU">STU</option>
                            <option value="CTU">CTU</option>
                          </select>
                        ) : (
                          item.transmissionType || '-'
                        )}
                      </td>
                      {canManageMasterPss && (
                        <td className="px-3 py-2 space-x-2 text-right">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveMaster}
                                className="text-xs font-medium text-teal-700 hover:text-teal-800"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditMaster}
                                className="text-xs font-medium text-slate-600 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditMaster(item)}
                                className="text-xs font-medium text-slate-600 hover:text-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMaster(item.id)}
                                className="text-xs font-medium text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredMasterPss.length === 0 && !loading && (
                  <tr>
                    <td className="px-3 py-2 text-sm text-slate-500" colSpan={canManageMasterPss ? 8 : 7}>
                      No master PSS entries match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {filteredMasterPss.length > 500 && (
              <p className="mt-2 text-[11px] text-slate-500">
                Showing first 500 rows. Refine the search to narrow down.
              </p>
            )}
          </div>

          {canManageMasterPss && (
            <details className="mt-4 border-t border-slate-200 pt-2 text-sm">
              <summary className="cursor-pointer text-xs font-medium text-teal-700">Add PSS</summary>
              <form onSubmit={handleCreateMaster} className="mt-3 grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600" htmlFor="master-name">
                    Name
                  </label>
                  <input
                    id="master-name"
                    type="text"
                    value={newMaster.name}
                    onChange={(e) => setNewMaster((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600" htmlFor="master-utility">
                    Utility
                  </label>
                  <input
                    id="master-utility"
                    type="text"
                    value={newMaster.utility}
                    onChange={(e) => setNewMaster((prev) => ({ ...prev, utility: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600" htmlFor="master-state">
                    State
                  </label>
                  <input
                    id="master-state"
                    type="text"
                    value={newMaster.state}
                    onChange={(e) => setNewMaster((prev) => ({ ...prev, state: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600" htmlFor="master-capacity">
                    Capacity (MW)
                  </label>
                  <input
                    id="master-capacity"
                    type="number"
                    step="0.01"
                    value={newMaster.capacityMw}
                    onChange={(e) => setNewMaster((prev) => ({ ...prev, capacityMw: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600" htmlFor="master-type">
                    Type (e.g. Solar, Wind)
                  </label>
                  <input
                    id="master-type"
                    type="text"
                    value={newMaster.type}
                    onChange={(e) => setNewMaster((prev) => ({ ...prev, type: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600" htmlFor="master-tech">
                    Technology
                  </label>
                  <input
                    id="master-tech"
                    type="text"
                    value={newMaster.technology}
                    onChange={(e) => setNewMaster((prev) => ({ ...prev, technology: e.target.value }))}
                    placeholder="SOLAR / WIND / ..."
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600" htmlFor="master-transmission">
                    Transmission
                  </label>
                  <select
                    id="master-transmission"
                    value={newMaster.transmissionType}
                    onChange={(e) =>
                      setNewMaster((prev) => ({
                        ...prev,
                        transmissionType: e.target.value as 'STU' | 'CTU' | '',
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">-</option>
                    <option value="STU">STU</option>
                    <option value="CTU">CTU</option>
                  </select>
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
                  >
                    Add PSS
                  </button>
                </div>
              </form>
            </details>
          )}
        </section>

        <p className="text-xs text-slate-400">
          Note: User management, client approval, and PSS mapping admin pages can be added as
          dedicated screens under "/admin/*".
        </p>
      </div>
    </Layout>
  );
};

export default AdminPage;

