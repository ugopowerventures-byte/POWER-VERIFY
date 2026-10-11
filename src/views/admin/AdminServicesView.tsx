import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { Service } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Sliders, Plus, Edit2, CheckCircle2, AlertCircle, Save, X, Trash2, Search } from 'lucide-react';

export const AdminServicesView: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await api.get('/services');
      setServices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      if (isCreating) {
        await api.post('/admin/services', editingService);
        setSuccessMsg('Service created successfully in database!');
      } else {
        await api.put(`/admin/services/${editingService.id}`, editingService);
        setSuccessMsg(`Service ${editingService.name} updated successfully!`);
      }
      setEditingService(null);
      setIsCreating(false);
      await fetchServices();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save service');
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (deletingServiceId) return;
    if (!window.confirm(`Are you sure you want to permanently delete service "${service.name}" (${service.code})?\n\nThis will remove it from the authoritative database.`)) {
      return;
    }
    try {
      setDeletingServiceId(service.id);
      await api.delete(`/admin/services/${service.id}`);
      setSuccessMsg(`Service "${service.name}" removed successfully.`);
      await fetchServices();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to remove service');
    } finally {
      setDeletingServiceId(null);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingService({
      id: '',
      code: 'NEW_SERVICE',
      name: 'New Verification Service',
      description: 'Service description...',
      price: 1000,
      status: 'ACTIVE',
      displayOrder: services.length + 1,
      requiredFields: [
        {
          name: 'queryValue',
          label: 'Identification Number',
          type: 'text',
          placeholder: 'Enter query value',
          required: true
        }
      ],
      icon: 'ShieldCheck',
      category: 'GENERAL',
      serviceType: 'verification',
      providerMapping: 'custom_gateway',
      createdAt: '',
      updatedAt: ''
    });
  };

  const categories = ['ALL', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || s.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Services & Pricing Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-bold text-xs">
              {services.length} Services
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Real-time database rate card. Changes immediately affect wallet deductions and live user portals.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-xs hover:brightness-110 shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#161616] p-4 rounded-2xl border border-[#262626]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search service name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#121212] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                categoryFilter === c
                  ? 'bg-orange-500 text-black'
                  : 'bg-[#202020] text-gray-300 hover:bg-[#282828]'
              }`}
            >
              {c.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-[#161616] rounded-3xl border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300 divide-y divide-[#262626]">
            <thead className="bg-[#1B1B1B] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-4 w-12 text-center">#</th>
                <th className="py-4 px-6">Service Name</th>
                <th className="py-4 px-6">Code</th>
                <th className="py-4 px-6">User Fee</th>
                <th className="py-4 px-6">Agent Fee</th>
                <th className="py-4 px-6">Provider</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {filteredServices.map((s, idx) => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-center font-mono text-gray-500 text-[11px]">
                    {s.displayOrder ?? (idx + 1)}
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-bold text-white block">{s.name}</span>
                    <span className="text-[10px] text-gray-500 line-clamp-1">{s.description}</span>
                  </td>
                  <td className="py-4 px-6 font-mono text-orange-400 font-bold">{s.code}</td>
                  <td className="py-4 px-6 font-mono font-black text-amber-400 text-sm">
                    {formatCurrency(s.price)}
                  </td>
                  <td className="py-4 px-6 font-mono font-black text-emerald-400 text-sm">
                    {formatCurrency(s.agentPrice ?? Math.round(s.price * 0.75))}
                  </td>
                  <td className="py-4 px-6">
                    {(() => {
                      const prov = (s.defaultProvider || 'default').toLowerCase();
                      if (prov === 'admin' || prov === 'admin_gateway' || prov === 'manual') {
                        return (
                          <span className="inline-block px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            Admin Gateway
                          </span>
                        );
                      }
                      if (prov === 'ninja') {
                        return (
                          <span className="inline-block px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
                            Ninja Gateway
                          </span>
                        );
                      }
                      if (prov === 'veripine') {
                        return (
                          <span className="inline-block px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            Veripine Gateway
                          </span>
                        );
                      }
                      return (
                        <span className="inline-block px-2.5 py-1 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Default Routing
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-4 px-6 text-gray-400">{s.category}</td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={async () => {
                        const newStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                        try {
                          await api.put(`/admin/services/${s.id}`, { status: newStatus });
                          setSuccessMsg(`Service ${s.name} is now ${newStatus}`);
                          await fetchServices();
                          setTimeout(() => setSuccessMsg(null), 3000);
                        } catch (err: any) {
                          alert(err.message || 'Failed to toggle status');
                        }
                      }}
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : s.status === 'MAINTENANCE'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                      }`}
                      title="Click to toggle ON/OFF"
                    >
                      {s.status} ⟳
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsCreating(false);
                          setEditingService({ ...s });
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-orange-500 hover:text-black font-bold text-xs transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit / Reprice</span>
                      </button>
                      <button
                        onClick={() => handleDeleteService(s)}
                        disabled={deletingServiceId === s.id}
                        className={`inline-flex items-center p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors ${
                          deletingServiceId === s.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        title="Delete Service"
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${deletingServiceId === s.id ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#181818] border border-[#2E2E2E] rounded-3xl max-w-lg w-full p-6 space-y-6 text-white my-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#282828]">
              <h3 className="font-extrabold text-base">
                {isCreating ? 'Create New Service' : `Edit Service: ${editingService.name}`}
              </h3>
              <button
                onClick={() => setEditingService(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-sm focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                    Service Code
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isCreating}
                    value={editingService.code}
                    onChange={(e) => setEditingService({ ...editingService, code: e.target.value })}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-sm font-mono focus:outline-none focus:border-[#FF6B00] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-amber-400 mb-1">
                    User Fee ({formatCurrency(editingService.price)})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={50}
                    value={editingService.price}
                    onChange={(e) => {
                      const newP = Number(e.target.value);
                      setEditingService({
                        ...editingService,
                        price: newP,
                        agentPrice: editingService.agentPrice ?? Math.round(newP * 0.75)
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-400 mb-1">
                    Agent Fee ({formatCurrency(editingService.agentPrice ?? Math.round(editingService.price * 0.75))})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={50}
                    value={editingService.agentPrice ?? Math.round(editingService.price * 0.75)}
                    onChange={(e) => setEditingService({ ...editingService, agentPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingService.description}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                    Status
                  </label>
                  <select
                    value={editingService.status}
                    onChange={(e) => setEditingService({ ...editingService, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs focus:outline-none focus:border-[#FF6B00]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                    Routing Provider
                  </label>
                  <select
                    value={editingService.defaultProvider || 'default'}
                    onChange={(e) => setEditingService({ ...editingService, defaultProvider: e.target.value })}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs focus:outline-none focus:border-[#FF6B00]"
                  >
                    <option value="default">Default Routing</option>
                    <option value="ninja">Ninja Identity Gateway</option>
                    <option value="veripine">Veripine Gateway</option>
                    <option value="admin">Admin Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={editingService.category}
                    onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                    Order Index
                  </label>
                  <input
                    type="number"
                    value={editingService.displayOrder ?? 1}
                    onChange={(e) => setEditingService({ ...editingService, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#282828]">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-gray-300 font-bold text-xs hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-xs hover:brightness-110 shadow-md"
                >
                  Save Service Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
