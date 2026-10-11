import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/common/UserAvatar';
import { Skeleton } from '../../components/common/Skeleton';
import {
  Users,
  Search,
  ShieldCheck,
  UserX,
  UserCheck,
  RefreshCw,
  Key,
  Shield,
  Fingerprint,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Trash2,
  Eye,
  X,
  Wallet,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';

export const AdminUsersView: React.FC = () => {
  const { user: currentUser, navigate } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/users');
      setUsers(data || []);
    } catch (err: any) {
      console.error(err);
      setActionNotice({ type: 'error', text: err.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (targetUser: User) => {
    if (!canSuspendUser(targetUser)) {
      alert('You do not have permission to suspend or modify this account.');
      return;
    }
    const newStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmPrompt = newStatus === 'SUSPENDED'
      ? `Are you sure you want to SUSPEND @${targetUser.username}'s account?\n\nThis will immediately revoke their access and block login until reactivated.`
      : `Are you sure you want to REMOVE SUSPENSION and activate @${targetUser.username}'s account?`;

    if (!confirm(confirmPrompt)) return;

    try {
      const res = await api.patch(`/admin/users/${targetUser.id}/status`, { status: newStatus });
      setActionNotice({
        type: 'success',
        text: res.message || `Account for @${targetUser.username} is now ${newStatus}.`
      });
      await fetchUsers();
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Failed to update user status' });
    }
  };

  // Promotion / Demotion Flow - MEGA ADMIN or SUPER ADMIN changes role in User Directory
  const handleRoleChange = async (targetUser: User, newRole: string) => {
    if (!targetUser || targetUser?.role === newRole) return;

    // Optimistic UI update for immediate visual feedback
    const previousRole = targetUser?.role;
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole as any } : u))
    );

    try {
      const res = await api.patch(`/admin/users/${targetUser.id}/role`, { role: newRole });
      await fetchUsers();

      const onboardingNotice =
        newRole === 'AGENT'
          ? 'Agent onboarding required.'
          : newRole === 'ADMIN'
          ? 'Admin onboarding required.'
          : newRole === 'SUPER_ADMIN'
          ? 'Super Admin onboarding required.'
          : '';

      const fullMsg = `Role for @${targetUser.username} updated to ${newRole.replace(/_/g, ' ')}.${onboardingNotice ? ' ' + onboardingNotice : ''}`;
      setActionNotice({ type: 'success', text: fullMsg });

      if (selectedUser?.id === targetUser.id) {
        setSelectedUser((prev) => (prev ? { ...prev, role: newRole as any, onboardingStatus: res.user?.onboardingStatus || 'not_started' } : null));
      }
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err: any) {
      // Revert optimistic update on error
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: previousRole } : u))
      );
      setActionNotice({ type: 'error', text: err.message || 'Failed to change role' });
    }
  };

  // Rule 9: Online NIN Registration service management for Agent accounts
  const handleToggleOnlineNinService = async (targetUser: User) => {
    const isCurrentlyAssigned = Boolean(targetUser.assignedServices?.includes('ONLINE_NIN_REGISTRATION'));
    const actionLabel = isCurrentlyAssigned ? 'remove' : 'assign';

    if (!confirm(`Are you sure you want to ${actionLabel} Online NIN Registration service for agent @${targetUser.username}?`)) {
      return;
    }

    try {
      setAssigningId(targetUser.id);
      if (isCurrentlyAssigned) {
        await api.delete(`/admin/agents/${targetUser.id}/services/online-nin`);
      } else {
        await api.post(`/admin/agents/${targetUser.id}/services/online-nin`, {});
      }
      setActionNotice({ type: 'success', text: `Online NIN Registration service ${actionLabel}ed for agent @${targetUser.username}.` });
      await fetchUsers();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || `Failed to ${actionLabel} Online NIN Registration service.` });
    } finally {
      setAssigningId(null);
    }
  };

  // Suspension and Deletion permissions with strict role hierarchy
  const canSuspendUser = (target?: User | null) => {
    if (!target) return false;
    if ((target?.role as string) === 'MEGA_ADMIN') return false;
    if (currentUser?.role === 'MEGA_ADMIN') return true;
    if (currentUser?.role === 'SUPER_ADMIN') {
      return (target?.role as string) !== 'SUPER_ADMIN' && (target?.role as string) !== 'MEGA_ADMIN';
    }
    if (currentUser?.role === 'ADMIN') {
      return (target?.role as string) !== 'ADMIN' && (target?.role as string) !== 'SUPER_ADMIN' && (target?.role as string) !== 'MEGA_ADMIN';
    }
    return false;
  };

  const canDeleteUser = (target?: User | null) => {
    if (!target) return false;
    if ((target?.role as string) === 'MEGA_ADMIN') return false;
    if (currentUser?.role === 'MEGA_ADMIN') return true;
    if (currentUser?.role === 'SUPER_ADMIN') {
      return (target?.role as string) !== 'SUPER_ADMIN' && (target?.role as string) !== 'MEGA_ADMIN';
    }
    if (currentUser?.role === 'ADMIN') {
      return (target?.role as string) !== 'ADMIN' && (target?.role as string) !== 'SUPER_ADMIN' && (target?.role as string) !== 'MEGA_ADMIN';
    }
    return false;
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (!targetUser) return;
    if ((targetUser?.role as string) === 'MEGA_ADMIN') {
      alert('Cannot delete the Mega Administrator account.');
      return;
    }

    if (currentUser?.role === 'SUPER_ADMIN' && ((targetUser?.role as string) === 'SUPER_ADMIN' || (targetUser?.role as string) === 'MEGA_ADMIN')) {
      alert('Super Admins cannot delete fellow Super Admin or Mega Admin accounts.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to PERMANENTLY DELETE user @${targetUser.username} (${targetUser.fullName})?\n\nThis will remove their account credentials, profile data, active wallet, and access permissions.\n\nThis action CANNOT be undone.`
      )
    ) {
      return;
    }

    try {
      setDeletingId(targetUser.id);
      const res = await api.delete(`/admin/users/${targetUser.id}`);
      setActionNotice({ type: 'success', text: res.message || `Account for ${targetUser.email} has been permanently deleted.` });
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(null);
      }
      await fetchUsers();
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Failed to delete user account.' });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search));
    const matchesRole = roleFilter === 'ALL' || u?.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isSuperOrMega = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MEGA_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            User Directory & Access Controls
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage user credentials, assign Online NIN Registration service, and inspect authoritative profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/onboarding')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-xs hover:bg-orange-500/20 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Onboarding Approvals</span>
          </button>

          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#161616] p-4 rounded-2xl border border-[#262626]">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by name, email, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#121212] rounded-xl border border-[#333] text-xs text-white focus:outline-none focus:border-[#FF6B00]"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { key: 'ALL', label: 'ALL' },
            { key: 'USER', label: 'USER' },
            { key: 'AGENT', label: 'AGENT' },
            { key: 'ADMIN', label: 'ADMIN' },
            { key: 'SUPER_ADMIN', label: 'SUPER ADMIN' },
            { key: 'MEGA_ADMIN', label: 'MEGA ADMIN' }
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => setRoleFilter(r.key)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                roleFilter === r.key
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black shadow-md'
                  : 'bg-[#121212] text-gray-400 hover:text-white border border-[#2A2A2A]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#161616] rounded-3xl border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300 divide-y divide-[#262626]">
            <thead className="bg-[#1B1B1B] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">User / Account</th>
                <th className="py-4 px-6">Current Role</th>
                <th className="py-4 px-6">Onboarding Verification</th>
                <th className="py-4 px-6">Online NIN Registration</th>
                <th className="py-4 px-6">Role Management</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {loading && users.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-fadeIn">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Skeleton variant="dark" className="w-10 h-10 shrink-0" rounded="full" />
                        <div className="space-y-1.5">
                          <Skeleton variant="dark" className="h-4 w-32" />
                          <Skeleton variant="dark" className="h-3 w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton variant="dark" className="h-6 w-20" rounded="lg" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton variant="dark" className="h-5 w-24" rounded="full" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton variant="dark" className="h-5 w-24" rounded="full" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton variant="dark" className="h-8 w-28" rounded="xl" />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Skeleton variant="dark" className="h-5 w-16 mx-auto" rounded="full" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Skeleton variant="dark" className="h-7 w-16" rounded="lg" />
                        <Skeleton variant="dark" className="h-7 w-16" rounded="lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filtered.map((u) => {
                const roleFormatted = (u?.role || 'USER').replace(/_/g, ' ').toUpperCase();
                const roleBadgeStyle =
                  u?.role === 'MEGA_ADMIN'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : u?.role === 'SUPER_ADMIN'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : u?.role === 'ADMIN'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : u?.role === 'AGENT'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';

                const hasOnlineNin = Boolean(u?.assignedServices?.includes('ONLINE_NIN_REGISTRATION'));
                const isAgentOrAdmin = u?.role === 'AGENT' || u?.role === 'ADMIN';

                return (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    {/* User Particulars with Authoritative Avatar */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={u} size="md" showBorder className="shrink-0" />
                        <div>
                          <span className="font-bold text-white block">{u.fullName}</span>
                          <span className="text-[10px] text-gray-400">{u.email}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500 font-mono">@{u.username}</span>
                            {u.phone && <span className="text-[10px] text-gray-500">• {u.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-6">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase ${roleBadgeStyle}`}>
                        {roleFormatted}
                      </span>
                    </td>

                    {/* Onboarding Verification Status */}
                    <td className="py-4 px-6">
                      {u?.role === 'MEGA_ADMIN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          <ShieldCheck className="w-3 h-3" />
                          Founder / Mega Admin
                        </span>
                      ) : u.onboardingStatus === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          COMPLETED
                        </span>
                      ) : u.onboardingStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                          <Clock className="w-3 h-3" />
                          PENDING APPROVAL
                        </span>
                      ) : u.onboardingStatus === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                          <UserX className="w-3 h-3" />
                          Rejected
                        </span>
                      ) : isAgentOrAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-800 text-gray-500">
                          Not Required
                        </span>
                      )}
                    </td>

                    {/* Online NIN Registration Assignment (Rule 9) */}
                    <td className="py-4 px-6">
                      {isAgentOrAdmin ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              hasOnlineNin
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-gray-800 text-gray-500 border border-gray-700'
                            }`}
                          >
                            <Fingerprint className="w-3 h-3" />
                            {hasOnlineNin ? 'Assigned' : 'Not Assigned'}
                          </span>

                          {isSuperOrMega && (
                            <button
                              onClick={() => handleToggleOnlineNinService(u)}
                              disabled={assigningId === u.id}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                hasOnlineNin
                                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                                  : 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/30'
                              }`}
                            >
                              {assigningId === u.id ? 'Saving...' : hasOnlineNin ? 'Remove' : '+ Assign'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-600">Requires Agent Role</span>
                      )}
                    </td>

                    {/* Role Dropdown / Permanent Badge */}
                    <td className="py-4 px-6">
                      {u?.role === 'MEGA_ADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/40">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>PERMANENT MEGA ADMIN</span>
                        </span>
                      ) : (
                        <select
                          value={u?.role || 'USER'}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className="px-2.5 py-1.5 bg-[#121212] border border-[#333] rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          <option value="USER">USER</option>
                          <option value="AGENT">AGENT</option>
                          <option value="ADMIN">ADMIN</option>
                          {currentUser?.role === 'MEGA_ADMIN' && <option value="SUPER_ADMIN">SUPER ADMIN</option>}
                        </select>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    {/* Actions: View Details, Suspend/Activate, Delete */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                          title="View Account Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Details</span>
                        </button>

                        {canSuspendUser(u) && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              u.status === 'SUSPENDED'
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40'
                                : u.status === 'ACTIVE'
                                ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                            }`}
                          >
                            {u.status === 'SUSPENDED' ? 'Remove Suspension' : u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        )}

                        {canDeleteUser(u) && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={deletingId === u.id}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            title="Permanently Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{deletingId === u.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#2D2D2D] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl space-y-6 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#2D2D2D]">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                <h3 className="font-extrabold text-white text-base">User Account Particulars</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <UserAvatar user={selectedUser} size="xl" showBorder className="shadow-2xl shrink-0" />
              <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                <h4 className="text-xl font-black text-white">{selectedUser.fullName}</h4>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-gray-400">
                  <span className="font-mono text-orange-400">@{selectedUser.username}</span>
                  <span>•</span>
                  <span>{selectedUser.email}</span>
                </div>
                {selectedUser.phone && (
                  <p className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    <span>{selectedUser.phone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#121212] p-3 rounded-2xl border border-[#262626] space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Account Role</span>
                <p className="font-bold text-white uppercase">{selectedUser?.role?.replace(/_/g, ' ') || 'USER'}</p>
              </div>

              <div className="bg-[#121212] p-3 rounded-2xl border border-[#262626] space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Account Status</span>
                <p className={`font-bold uppercase ${selectedUser.status === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {selectedUser.status}
                </p>
              </div>

              <div className="bg-[#121212] p-3 rounded-2xl border border-[#262626] space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Onboarding Verification</span>
                <p className="font-bold text-amber-400 capitalize">
                  {selectedUser?.role === 'MEGA_ADMIN'
                    ? 'Founder / Mega Admin'
                    : selectedUser.onboardingStatus === 'approved'
                    ? 'COMPLETED'
                    : selectedUser.onboardingStatus === 'pending'
                    ? 'PENDING APPROVAL'
                    : selectedUser.onboardingStatus === 'rejected'
                    ? 'REJECTED'
                    : selectedUser?.role !== 'USER'
                    ? 'PENDING'
                    : 'Not Required'}
                </p>
              </div>

              <div className="bg-[#121212] p-3 rounded-2xl border border-[#262626] space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Wallet Balance</span>
                <p className="font-bold text-orange-400 font-mono">
                  {selectedUser.walletBalance !== undefined ? `${selectedUser.walletBalance.toLocaleString()} Credits` : '0 Credits'}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#262626]">
              <div className="flex items-center gap-2">
                {canSuspendUser(selectedUser) && (
                  <button
                    onClick={() => handleToggleStatus(selectedUser)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedUser.status === 'SUSPENDED'
                        ? 'bg-red-500/25 text-red-300 hover:bg-red-500/35 border border-red-500/40'
                        : selectedUser.status === 'ACTIVE'
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                    }`}
                  >
                    {selectedUser.status === 'SUSPENDED' ? 'Remove Suspension' : selectedUser.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                  </button>
                )}

                {canDeleteUser(selectedUser) && (
                  <button
                    onClick={() => handleDeleteUser(selectedUser)}
                    disabled={deletingId === selectedUser.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deletingId === selectedUser.id ? 'Deleting...' : 'Delete Permanently'}</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 text-gray-200 text-xs font-bold hover:bg-white/15 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
