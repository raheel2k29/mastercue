'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PricingConfig, AdminItemPrice, AdminSplicePrice, AdminPlatePrice } from '@/types/admin';
import { OrderRecord, OrderStatus } from '@/types/order';
import { getDefaultPricingConfig } from '@/lib/defaultPricing';
import { calculatePrice, getDefaultCue } from '@/lib/cueEngine';
import { CUE_SHAFTS, CUE_JOINTS, CUE_SPLICES } from '@/lib/cueData';
import {
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Sliders,
  DollarSign,
  Calculator,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  LogOut,
  Database,
  User,
  Users,
  Loader2,
  Search,
  Zap,
  PackageCheck,
  Mail,
  Phone,
  MapPin,
  Printer,
  Briefcase,
  Menu,
  X,
  ChevronRight,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function AdminPricingPage() {
  const router = useRouter();

  // Admin session & database state
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [dbStatus, setDbStatus] = useState<{
    type: string;
    connected: boolean;
    latencyMs?: number;
    version?: number;
    lastUpdated?: string;
  }>({
    type: 'postgresql',
    connected: true,
    latencyMs: 25,
  });

  // Config & Orders state
  const [config, setConfig] = useState<PricingConfig>(() => getDefaultPricingConfig());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'orders' | 'users' | 'shafts' | 'splices' | 'joints' | 'cases' | 'plates' | 'simulator'
  >('orders');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    'all' | 'priority' | 'pending' | 'in_crafting' | 'shipped' | 'completed'
  >('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const lastSavedJsonRef = React.useRef<string>('');

  const isDirty = React.useMemo(() => {
    if (!lastSavedJsonRef.current) return false;
    return JSON.stringify(config) !== lastSavedJsonRef.current;
  }, [config]);

  // Warn before leaving if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Global Ctrl+S / Cmd+S shortcut to save instantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config, saving]);

  // Load existing config from API
  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/pricing?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        lastSavedJsonRef.current = JSON.stringify(data.config);
        if (data.config.lastUpdated) {
          setLastSavedTime(new Date(data.config.lastUpdated).toLocaleTimeString());
        }
      }
    } catch (err: any) {
      setSaveError('Failed to load server configuration. Using fail-safe defaults.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch real-time customer orders from PostgreSQL
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch(`/api/orders?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch real-time registered customer accounts from PostgreSQL
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const res = await fetch(`/api/admin/customers?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Update order status (pending, in_crafting, shipped, completed, cancelled)
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingStatusId(orderId);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Auth check on mount
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        setAuthChecking(true);
        const meRes = await fetch('/api/admin/me', { cache: 'no-store' });
        const meData = await meRes.json();
        if (!meData.authenticated) {
          router.push('/admin/login');
          return;
        }
        setCurrentUser(meData.user?.email || 'admin@mastercue.com');
        if (meData.dbStatus) {
          setDbStatus(meData.dbStatus);
        }
        await Promise.all([loadConfig(), fetchOrders(), fetchCustomers()]);
      } catch (e) {
        router.push('/admin/login');
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuthAndLoad();
  }, [router]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch {
      router.push('/admin/login');
    }
  };

  // Save updated config
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setConfig(data.config);
      lastSavedJsonRef.current = JSON.stringify(data.config);
      setLastSavedTime(new Date().toLocaleTimeString());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);

      // Instant cross-tab real-time sync with storefront/customizer
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('mastercue-pricing');
        channel.postMessage({ type: 'PRICING_UPDATED', timestamp: Date.now() });
        channel.close();
      }

      // Refresh health & latency
      fetch('/api/admin/health?_t=' + Date.now())
        .then((r) => r.json())
        .then((h) => {
          if (h.success) {
            setDbStatus({
              type: h.type === 'neon-postgresql' ? 'postgresql' : 'local',
              connected: h.connected,
              latencyMs: h.latencyMs,
              version: h.version,
              lastUpdated: h.lastUpdated,
            });
          }
        })
        .catch(() => {});
    } catch (err: any) {
      setSaveError(err.message || 'Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  // Reset to factory defaults
  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset all pricing to factory defaults? All manual edits will be overwritten with original CueWizard baseline rates.'
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        lastSavedJsonRef.current = JSON.stringify(data.config);
        setLastSavedTime(new Date().toLocaleTimeString());
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);

        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('mastercue-pricing');
          channel.postMessage({ type: 'PRICING_UPDATED', timestamp: Date.now() });
          channel.close();
        }
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to reset pricing');
    } finally {
      setSaving(false);
    }
  };

  // Helpers to update individual values
  const updateShaftPrice = (id: string, price: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      shafts: prev.shafts.map((s) =>
        s.id === id ? { ...s, price, ...(enabled !== undefined ? { enabled } : {}) } : s
      ),
    }));
  };

  const updateLengthPrice = (id: string, price: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      lengths: prev.lengths.map((l) =>
        l.id === id ? { ...l, price, ...(enabled !== undefined ? { enabled } : {}) } : l
      ),
    }));
  };

  const updateFerrulePrice = (id: string, price: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      ferrules: prev.ferrules.map((f) =>
        f.id === id
          ? {
              ...f,
              price: Math.max(0, isNaN(price) ? 0 : price),
              ...(enabled !== undefined ? { enabled } : {}),
            }
          : f
      ),
    }));
  };

  const applyBulkAdjustment = (mode: 'percent' | 'flat', amount: number) => {
    if (!amount) return;
    const calc = (current: number) => {
      if (mode === 'percent') {
        return Math.max(0, Math.round(current * (1 + amount / 100)));
      }
      return Math.max(0, Math.round(current + amount));
    };

    setConfig((prev) => {
      if (activeTab === 'shafts') {
        return {
          ...prev,
          shafts: prev.shafts.map((s) => ({ ...s, price: calc(s.price) })),
        };
      } else if (activeTab === 'splices') {
        return {
          ...prev,
          splices: prev.splices.map((s) => ({
            ...s,
            onePrice: calc(s.onePrice),
            fourPrice: calc(s.fourPrice),
          })),
        };
      } else if (activeTab === 'joints') {
        return {
          ...prev,
          ferrules: prev.ferrules.map((f) => ({
            ...f,
            price: f.price > 0 ? calc(f.price) : f.price,
          })),
        };
      } else if (activeTab === 'plates') {
        return {
          ...prev,
          namePlates: prev.namePlates.map((p) => ({ ...p, price: calc(p.price) })),
          extensions: prev.extensions.map((e) => ({ ...e, price: calc(e.price) })),
          miniButts: prev.miniButts.map((m) => ({ ...m, price: calc(m.price) })),
        };
      } else if (activeTab === 'cases') {
        return {
          ...prev,
          cases: (prev.cases || []).map((c) => ({ ...c, price: calc(c.price) })),
        };
      }
      return prev;
    });
  };

  const updateSplicePrice = (id: string, onePrice: number, fourPrice: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      splices: prev.splices.map((s) =>
        s.id === id
          ? {
              ...s,
              onePrice,
              fourPrice,
              ...(enabled !== undefined ? { enabled } : {})
            }
          : s
      ),
    }));
  };

  const updateSurcharges = (
    field: 'buttJointFittingPrice' | 'domeJointPrice' | 'priorityCraftingPrice',
    val: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      surcharges: {
        ...prev.surcharges,
        [field]: val,
      },
    }));
  };

  const updatePlatePrice = (id: string, price: number, engravingPrice: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      namePlates: prev.namePlates.map((p) =>
        p.id === id
          ? {
              ...p,
              price,
              engravingPrice,
              ...(enabled !== undefined ? { enabled } : {})
            }
          : p
      ),
    }));
  };

  const updateExtensionPrice = (id: string, price: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      extensions: prev.extensions.map((e) =>
        e.id === id ? { ...e, price, ...(enabled !== undefined ? { enabled } : {}) } : e
      ),
    }));
  };

  const updateMiniButtPrice = (id: string, price: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      miniButts: prev.miniButts.map((m) =>
        m.id === id ? { ...m, price, ...(enabled !== undefined ? { enabled } : {}) } : m
      ),
    }));
  };

  const updateCasePrice = (id: string, price: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      cases: (prev.cases || []).map((c) =>
        c.id === id ? { ...c, price, ...(enabled !== undefined ? { enabled } : {}) } : c
      ),
    }));
  };

  const updateCaseItem = (id: string, patch: Partial<AdminItemPrice>) => {
    setConfig((prev) => ({
      ...prev,
      cases: (prev.cases || []).map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  };

  // -------------------------------------------------------------
  // Live Simulator Calculations (Instant Sanity Check)
  // -------------------------------------------------------------
  const [simPreset, setSimPreset] = useState<'standard' | 'tournament' | 'exotic'>('tournament');

  const simCue = React.useMemo(() => {
    const base = getDefaultCue();
    const ashExecutive = config.shafts.find((s) => s.name.toLowerCase().includes('executive'));
    const ashProfessional = config.shafts.find((s) => s.name.toLowerCase().includes('professional'));
    const snakewood = config.splices.find((s) => s.name.toLowerCase().includes('snake'));

    if (simPreset === 'standard') {
      return {
        ...base,
        shaft: { ...base.shaft!, price: ashExecutive?.price ?? 585 },
        buttJoint: CUE_JOINTS[0], // No Joint
        endButtJoin: false,
        largeSplices: 0,
      };
    } else if (simPreset === 'tournament') {
      return {
        ...base,
        shaft: { ...base.shaft!, price: ashExecutive?.price ?? 585 },
        buttJoint: CUE_JOINTS[1], // 3/4 Joint
        endButtJoin: true,
        largeSplices: 0,
      };
    } else {
      return {
        ...base,
        shaft: { ...base.shaft!, price: ashProfessional?.price ?? 924 },
        buttJoint: CUE_JOINTS[1],
        endButtJoin: true,
        largeSplices: 4,
        largeSpliceMaterial: {
          ...CUE_SPLICES[1],
          fourPrice: snakewood?.fourPrice ?? 290,
        },
      };
    }
  }, [simPreset, config]);

  const simPricing = calculatePrice(simCue, {
    buttJointFittingPrice: config.surcharges.buttJointFittingPrice,
    domeJointPrice: config.surcharges.domeJointPrice,
  });

  // Filtered lists for catalog tabs
  const q = searchQuery.toLowerCase().trim();
  const filteredShafts = q ? config.shafts.filter((s) => s.name.toLowerCase().includes(q)) : config.shafts;
  const filteredLengths = q ? config.lengths.filter((l) => l.name.toLowerCase().includes(q)) : config.lengths;
  const filteredSplices = q ? config.splices.filter((s) => s.name.toLowerCase().includes(q)) : config.splices;
  const filteredVeneers = q ? config.veneers.filter((v) => v.name.toLowerCase().includes(q)) : config.veneers;
  const filteredFerrules = q ? config.ferrules.filter((f) => f.name.toLowerCase().includes(q)) : config.ferrules;
  const filteredPlates = q ? config.namePlates.filter((p) => p.name.toLowerCase().includes(q)) : config.namePlates;
  const filteredExtensions = q ? config.extensions.filter((e) => e.name.toLowerCase().includes(q)) : config.extensions;
  const filteredMiniButts = q ? config.miniButts.filter((m) => m.name.toLowerCase().includes(q)) : config.miniButts;
  const filteredCases = (config.cases || []).filter((c) => !q || c.name.toLowerCase().includes(q));

  // Orders statistics
  const priorityOrdersCount = useMemo(
    () => orders.filter((o) => o.serviceLevel === 'priority' || o.cue?.priorityService).length,
    [orders]
  );
  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  );
  const craftingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'in_crafting').length,
    [orders]
  );
  const shippedOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'shipped').length,
    [orders]
  );
  const completedOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'completed').length,
    [orders]
  );

  // Filtered Orders for the Orders Tab
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (orderStatusFilter === 'priority') {
        const isPriority = ord.serviceLevel === 'priority' || ord.cue?.priorityService;
        if (!isPriority) return false;
      } else if (orderStatusFilter !== 'all') {
        if (ord.status !== orderStatusFilter) return false;
      }

      if (!q) return true;
      return (
        (ord.orderNumber || '').toLowerCase().includes(q) ||
        (ord.customer?.fullName || '').toLowerCase().includes(q) ||
        (ord.customer?.email || '').toLowerCase().includes(q) ||
        (ord.customer?.city || '').toLowerCase().includes(q) ||
        (ord.customer?.country || '').toLowerCase().includes(q) ||
        (ord.cue?.shaft?.name || '').toLowerCase().includes(q) ||
        (ord.cue?.engraving || '').toLowerCase().includes(q)
      );
    });
  }, [orders, orderStatusFilter, q]);

  // Customer metrics & lookup map
  const customerMetrics = useMemo(() => {
    const customerOrdersMap: Record<string, { count: number; spend: number }> = {};
    orders.forEach((o) => {
      const email = o.customer?.email?.toLowerCase().trim();
      if (email) {
        if (!customerOrdersMap[email]) {
          customerOrdersMap[email] = { count: 0, spend: 0 };
        }
        customerOrdersMap[email].count += 1;
        customerOrdersMap[email].spend += Number(o.pricing?.total) || 0;
      }
    });

    const customersWithOrdersCount = Object.keys(customerOrdersMap).length;
    const totalSpendAllCustomers = Object.values(customerOrdersMap).reduce((sum, v) => sum + v.spend, 0);

    return {
      customerOrdersMap,
      customersWithOrdersCount,
      totalSpendAllCustomers,
    };
  }, [orders]);

  // Filtered Customers for Users Tab
  const filteredCustomers = useMemo(() => {
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.fullName || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q)
    );
  }, [customers, q]);

  // Quick helper to view orders from customer row
  const viewCustomerOrders = (customerEmail: string) => {
    setSearchQuery(customerEmail);
    setOrderStatusFilter('all');
    setActiveTab('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-semibold tracking-wide">Verifying Admin Session Security...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-white">
      <div className="flex flex-1 min-h-screen">
        {/* Mobile Drawer Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ======================================================== */}
        {/* LEFT NAVIGATION DRAWER / SIDEBAR */}
        {/* ======================================================== */}
        <aside
          className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Brand Area */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner shadow-amber-500/20">
                🎱
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-black text-white tracking-wider">MASTER CUE</h1>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    ADMIN
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Workshop & Pricing Suite</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sections */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* SECTION 1: OPERATIONS */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span>Operations</span>
                <span className="text-[9px] text-emerald-400 font-mono">Live</span>
              </div>

              {/* Customer Orders Tab */}
              <button
                onClick={() => {
                  setActiveTab('orders');
                  setSidebarOpen(false);
                  fetchOrders();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'orders'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>Customer Orders</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {priorityOrdersCount > 0 && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                        activeTab === 'orders'
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                      title="${priorityOrdersCount} Priority Orders"
                    >
                      <Zap className="w-2.5 h-2.5" />
                      {priorityOrdersCount}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'orders'
                        ? 'bg-slate-950/30 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {orders.length}
                  </span>
                </div>
              </button>

              {/* Registered Users Tab */}
              <button
                onClick={() => {
                  setActiveTab('users');
                  setSidebarOpen(false);
                  fetchCustomers();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'users'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Registered Users</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'users'
                      ? 'bg-slate-950/30 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {customers.length}
                </span>
              </button>
            </div>

            {/* SECTION 2: PRICING & CATALOG */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Pricing & Catalog
              </div>
              {[
                { id: 'shafts', label: 'Shafts & Lengths', icon: Layers, count: config.shafts.length + config.lengths.length },
                { id: 'splices', label: 'Exotic Splices (12)', icon: Sparkles, count: config.splices.length },
                { id: 'joints', label: 'Joints & Surcharges', icon: Sliders, count: config.ferrules.length + 3 },
                { id: 'cases', label: 'Case Bundles (5)', icon: Briefcase, count: (config.cases || []).length },
                { id: 'plates', label: 'Discs & Extras', icon: DollarSign, count: config.namePlates.length + config.extensions.length + config.miniButts.length },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isActive ? 'text-slate-900 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* SECTION 3: SYSTEM & DIAGNOSTICS */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Diagnostics
              </div>
              <button
                onClick={() => {
                  setActiveTab('simulator');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'simulator'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Calculator className="w-4 h-4 shrink-0" />
                  <span>Sanity Simulator</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    activeTab === 'simulator' ? 'text-slate-950' : 'text-emerald-400'
                  }`}
                >
                  Live
                </span>
              </button>
            </div>
          </div>

          {/* Sidebar Footer Area */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950 space-y-3">
            {/* PostgreSQL Live Ping & Latency */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-300">
                  {dbStatus.type === 'postgresql' ? 'Neon PostgreSQL' : 'Local Fallback'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                {dbStatus.latencyMs ? `${dbStatus.latencyMs}ms` : 'Active'}
              </span>
            </div>

            {/* Current User */}
            <div className="px-3 py-1 flex items-center gap-2 text-xs text-slate-400">
              <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{currentUser || 'admin@mastercue.com'}</span>
            </div>

            {/* Action Links */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                target="_blank"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Studio</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-xs font-semibold border border-slate-800 hover:border-red-500/30 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* MAIN CONTENT WORKSPACE */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 lg:hidden"
                title="Open Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="hidden sm:inline">Master Cue Admin</span>
                  <ChevronRight className="w-3 h-3 text-slate-600 hidden sm:inline" />
                  <span className="text-amber-400 font-bold capitalize truncate">
                    {activeTab === 'orders'
                      ? 'Customer Orders'
                      : activeTab === 'users'
                      ? 'Registered Users'
                      : activeTab === 'shafts'
                      ? 'Shafts & Lengths'
                      : activeTab === 'splices'
                      ? 'Exotic Splices'
                      : activeTab === 'joints'
                      ? 'Joints & Surcharges'
                      : activeTab === 'cases'
                      ? 'Case Bundles'
                      : activeTab === 'plates'
                      ? 'Discs & Extras'
                      : 'Sanity Simulator'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Unsaved indicator */}
              {isDirty && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold animate-pulse shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="hidden sm:inline">Unsaved Changes</span>
                  <span className="font-mono text-[10px] bg-amber-500/30 px-1 py-0.5 rounded">Ctrl+S</span>
                </div>
              )}

              {/* Reset Defaults button */}
              <button
                onClick={handleReset}
                disabled={saving}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-xs font-semibold text-slate-300 hover:text-red-300 border border-slate-800 transition"
                title="Reset all prices to factory defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg disabled:opacity-50 ${
                  isDirty
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-400/50 shadow-amber-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save All Changes'}</span>
                <span className="sm:hidden">{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </header>

          {/* Notification Toast */}
          {saveSuccess && (
            <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-400 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  <strong>All changes saved successfully!</strong> PostgreSQL database updated in real-time.
                </span>
              </div>
              <span className="text-[11px] opacity-75">Auto-synced</span>
            </div>
          )}

          {saveError && (
            <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-2.5 flex items-center gap-2 text-xs text-red-400 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Main Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
            {/* Database Integration Status Banner */}
            {dbStatus.type === 'postgresql' ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Live PostgreSQL Connected:</strong> High-speed Neon storage persists your orders, customers, and pricing rates permanently across redeployments.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                  DATABASE_URL Active
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
                <Database className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-200">
                    Notice: Running on Serverless / Safe Storage
                  </p>
                  <p className="text-amber-300/80 text-[11px] leading-relaxed">
                    Changes will persist in server memory. To persist changes permanently across all future Vercel deployments, connect a free PostgreSQL database by adding the <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-200">DATABASE_URL</code> variable in your Vercel Project Settings.
                  </p>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 1: CUSTOMER ORDERS MANAGEMENT */}
            {/* ======================================================== */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                {/* Orders Header & Summary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Orders
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-white font-mono">{orders.length}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Revenue
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                        £{orders.reduce((sum, o) => sum + (Number(o.pricing?.total) || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Workshop Queue
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
                        {pendingOrdersCount + craftingOrdersCount} active
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Priority Queue
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                        {priorityOrdersCount} cues
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Orders Filter & Search Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                  {/* Status Filter Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { id: 'all', label: `All (${orders.length})` },
                      { id: 'priority', label: `⚡ Priority (${priorityOrdersCount})` },
                      { id: 'pending', label: `Pending (${pendingOrdersCount})` },
                      { id: 'in_crafting', label: `In Crafting (${craftingOrdersCount})` },
                      { id: 'shipped', label: `Shipped (${shippedOrdersCount})` },
                      { id: 'completed', label: `Completed (${completedOrdersCount})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setOrderStatusFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                          orderStatusFilter === tab.id
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search and Refresh */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search orders, customers, cities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      onClick={fetchOrders}
                      disabled={loadingOrders}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                      title="Refresh Orders"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Orders List / Empty State */}
                {filteredOrders.length === 0 ? (
                  <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-white">
                        {searchQuery || orderStatusFilter !== 'all' ? 'No Matching Orders' : 'No Customer Orders Yet'}
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {searchQuery || orderStatusFilter !== 'all'
                          ? 'Try clearing the search query or changing the status filter to see other orders.'
                          : 'When visitors configure a bespoke cue and place an order, it appears here automatically with full specs and delivery details.'}
                      </p>
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setOrderStatusFilter('all');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-amber-400 hover:bg-slate-700 text-xs font-bold transition"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-white">Customer Bespoke Orders ({filteredOrders.length})</h2>
                        <p className="text-xs text-slate-400">
                          Click any order to view the 24-point comprehensive workshop build sheet.
                        </p>
                      </div>
                      <span className="text-xs text-emerald-400 font-medium">PostgreSQL Synced</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-700/80 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                            <th className="py-3 px-4">Order #</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Customer</th>
                            <th className="py-3 px-4">Cue Configuration</th>
                            <th className="py-3 px-4 text-right">Total (£)</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {filteredOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-700/30 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-mono font-bold text-amber-400">
                                  {ord.orderNumber}
                                </div>
                                {(ord.serviceLevel === 'priority' || ord.cue.priorityService) && (
                                  <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                                    ⚡ Priority (6 Wks)
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                                {new Date(ord.createdAt).toLocaleDateString()}{' '}
                                <span className="text-[10px] opacity-70">
                                  {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white">{ord.customer.fullName}</div>
                                <div className="text-[11px] text-slate-400">{ord.customer.email}</div>
                                <div className="text-[10px] text-slate-500">
                                  {ord.customer.city}, {ord.customer.country}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 max-w-xs">
                                <div className="font-semibold text-slate-200">
                                  {ord.cue.shaft?.name} • {ord.cue.length?.name}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  Ferrule: {ord.cue.ferruleType?.name} ({ord.cue.tipSize?.name}) • {ord.cue.weight}oz
                                </div>
                                {ord.cue.largeSpliceMaterial && (
                                  <div className="text-[10px] text-amber-400 font-semibold truncate">
                                    {ord.cue.largeSplices}-Splice {ord.cue.largeSpliceMaterial.name}
                                  </div>
                                )}
                                {ord.cue.largeVeneers && ord.cue.largeVeneers.filter((v) => v.name && v.name !== 'None').length > 0 && (
                                  <div className="text-[10px] text-sky-300 font-medium truncate">
                                    🎨 Veneers: {ord.cue.largeVeneers.filter((v) => v.name && v.name !== 'None').map((v) => v.name).join(' / ')}
                                  </div>
                                )}
                                {ord.cue.engraving && (
                                  <div className="text-[10px] text-amber-400/90 font-mono">
                                    Engraved: &quot;{ord.cue.engraving}&quot;
                                  </div>
                                )}
                                {ord.cue.case && ord.cue.case.id !== 'case_none' && (
                                  <div className="text-[10px] text-emerald-400 font-semibold truncate">
                                    🧰 Bundle: {ord.cue.case.name} (+£{ord.cue.case.bundlePrice})
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-white text-sm">
                                £{ord.pricing.total}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <select
                                  value={ord.status}
                                  disabled={updatingStatusId === ord.id}
                                  onChange={(e) => handleUpdateStatus(ord.id, e.target.value as OrderStatus)}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border focus:outline-none transition cursor-pointer ${
                                    ord.status === 'pending'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : ord.status === 'confirmed'
                                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                      : ord.status === 'in_crafting'
                                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                      : ord.status === 'shipped'
                                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                      : ord.status === 'completed'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-slate-700/50 text-slate-400 border-slate-600'
                                  }`}
                                >
                                  <option value="pending" className="bg-slate-900 text-white">Pending</option>
                                  <option value="confirmed" className="bg-slate-900 text-white">Confirmed</option>
                                  <option value="in_crafting" className="bg-slate-900 text-white">In Crafting</option>
                                  <option value="shipped" className="bg-slate-900 text-white">Shipped</option>
                                  <option value="completed" className="bg-slate-900 text-white">Completed</option>
                                  <option value="cancelled" className="bg-slate-900 text-white">Cancelled</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => setSelectedOrder(ord)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition shadow-sm"
                                >
                                  View Build Sheet
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: REGISTERED USERS MANAGEMENT */}
            {/* ======================================================== */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* Users Summary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Registered Users
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-white font-mono">{customers.length}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Active Buyers
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                        {customerMetrics.customersWithOrdersCount}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Customer Lifetime Spend
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                        £{customerMetrics.totalSpendAllCustomers.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Security Layer
                      </span>
                      <span className="text-sm font-bold text-slate-200">
                        Bcrypt Hashed
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Search & Actions Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search customers by name, email, phone, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                        title="Clear filter"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={fetchCustomers}
                    disabled={loadingCustomers}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCustomers ? 'animate-spin' : ''}`} />
                    <span>Refresh Customers</span>
                  </button>
                </div>

                {/* Customer Accounts Table */}
                {filteredCustomers.length === 0 ? (
                  <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-white">
                        {searchQuery ? 'No Customers Match Search' : 'No Registered Customers Yet'}
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {searchQuery
                          ? 'Try searching with a different name or email address.'
                          : 'When visitors sign up for an account via the customer portal or during checkout, their profile appears here automatically.'}
                      </p>
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-amber-400 hover:bg-slate-700 text-xs font-bold transition"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-white">Registered Customer Profiles ({filteredCustomers.length})</h2>
                        <p className="text-xs text-slate-400">
                          Directly queried from PostgreSQL <code className="text-amber-400 font-mono">customers</code> table. Password hashes are secured.
                        </p>
                      </div>
                      <span className="text-xs text-emerald-400 font-medium">PostgreSQL Live</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-700/80 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                            <th className="py-3 px-4">Customer</th>
                            <th className="py-3 px-4">Contact</th>
                            <th className="py-3 px-4">Shipping Location</th>
                            <th className="py-3 px-4 text-center">Orders</th>
                            <th className="py-3 px-4 text-right">Total Spent (£)</th>
                            <th className="py-3 px-4">Joined Date</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {filteredCustomers.map((cust) => {
                            const stats = customerMetrics.customerOrdersMap[cust.email?.toLowerCase().trim()] || {
                              count: 0,
                              spend: 0,
                            };
                            return (
                              <tr key={cust.id} className="hover:bg-slate-700/30 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs">
                                      {(cust.fullName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-white">{cust.fullName}</div>
                                      <div className="text-[11px] text-slate-400">{cust.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-300">
                                  {cust.phone ? (
                                    <div className="flex items-center gap-1.5">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      <span>{cust.phone}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 italic">No phone</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-slate-300">
                                  {cust.city || cust.country ? (
                                    <div>
                                      <div className="font-medium text-slate-200">
                                        {cust.city ? `${cust.city}, ` : ''}{cust.country || 'United Kingdom'}
                                      </div>
                                      {cust.postcode && (
                                        <div className="text-[10px] text-slate-500">{cust.postcode}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 italic">No address on file</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full font-mono text-xs font-bold ${
                                      stats.count > 0
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-slate-800 text-slate-500'
                                    }`}
                                  >
                                    {stats.count}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                                  £{stats.spend.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                                  {cust.createdAt
                                    ? new Date(cust.createdAt).toLocaleDateString()
                                    : 'Recent'}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {stats.count > 0 ? (
                                    <button
                                      onClick={() => viewCustomerOrders(cust.email)}
                                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
                                    >
                                      View Orders ({stats.count})
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-500">No Orders</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Order Build Sheet Inspection Drawer / Modal */}
            {selectedOrder && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
                <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto text-white">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-mono font-bold text-xs">
                        MC
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          <span>Order {selectedOrder.orderNumber}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {selectedOrder.status}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                    {/* Customer & Shipping Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <User className="w-3.5 h-3.5" />
                          Customer Contact
                        </h4>
                        <div className="space-y-1 text-slate-300">
                          <div className="font-bold text-white text-sm">{selectedOrder.customer.fullName}</div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{selectedOrder.customer.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{selectedOrder.customer.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <MapPin className="w-3.5 h-3.5" />
                          Delivery Destination
                        </h4>
                        <div className="space-y-1 text-slate-300">
                          <div>{selectedOrder.customer.addressLine1}</div>
                          {selectedOrder.customer.addressLine2 && <div>{selectedOrder.customer.addressLine2}</div>}
                          <div>
                            {selectedOrder.customer.city}, {selectedOrder.customer.postcode}
                          </div>
                          <div className="font-bold text-white">{selectedOrder.customer.country}</div>
                          <div className="text-[10px] text-slate-500 pt-1">
                            Payment: {selectedOrder.paymentMethod === 'invoice_bank_transfer' ? 'Direct Bank Transfer (BACS)' : 'Online Card / Invoice'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Crafting Notes */}
                    {selectedOrder.notes && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                        <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] block mb-1">
                          Customer Special Instructions:
                        </span>
                        <p className="text-slate-200 italic">&quot;{selectedOrder.notes}&quot;</p>
                      </div>
                    )}

                    {/* Complete Bespoke Cue Workshop Specifications */}
                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                        <h4 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                          <PackageCheck className="w-4 h-4 text-amber-400" />
                          <span>Complete Workshop Build Sheet</span>
                        </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {(selectedOrder.serviceLevel === 'priority' || selectedOrder.cue.priorityService)
                              ? '⚡ Priority Queue (6 Weeks)'
                              : 'Standard Queue (10–12 Weeks)'}
                          </span>
                          <span className="text-amber-400 font-mono font-black text-sm">
                            Total: £{selectedOrder.pricing.total}
                          </span>
                        </div>
                      </div>

                      {/* 1. Shaft & Taper Engineering */}
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                          1. Shaft Wood, Length, Ferrule & Tip
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Shaft Timber</span>
                            <span className="font-bold text-white">{selectedOrder.cue.shaft?.name || 'Ash'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Overall Length</span>
                            <span className="font-bold text-white">{selectedOrder.cue.length?.name || '58"'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Cue Weight</span>
                            <span className="font-bold text-amber-400 font-mono">{selectedOrder.cue.weight} oz</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Ferrule & Tip</span>
                            <span className="font-bold text-white">
                              {selectedOrder.cue.ferruleType?.name || 'Brass'} ({selectedOrder.cue.tipSize?.name || '9.5mm'})
                            </span>
                            {selectedOrder.cue.tip?.name && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">Tip: {selectedOrder.cue.tip.name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. Butt Timber, Splices & Color Veneers */}
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                          2. Butt Timber, Splices & Color Veneers
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Main Butt Timber</span>
                            <span className="font-bold text-white">{selectedOrder.cue.buttTimber?.name || 'Hand Spliced Ebony'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Joint System</span>
                            <span className="font-bold text-white">{selectedOrder.cue.buttJoint?.name || '1-Piece'}</span>
                          </div>

                          {/* Front Splices & Veneers */}
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 col-span-1 sm:col-span-2">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[10px]">Front Splices (Large)</span>
                              {selectedOrder.cue.largeSpliceMaterial ? (
                                <span className="text-amber-400 font-bold text-[11px]">
                                  {selectedOrder.cue.largeSplices}-Splice {selectedOrder.cue.largeSpliceMaterial.name}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Plain Wood (No Front Splices)</span>
                              )}
                            </div>
                            {selectedOrder.cue.largeSpliceMaterial && (
                              <div className="mt-2 pt-2 border-t border-slate-800/80">
                                <span className="text-slate-500 text-[10px] block mb-1">Color Veneer Layers:</span>
                                {selectedOrder.cue.largeVeneers && selectedOrder.cue.largeVeneers.length > 0 ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {selectedOrder.cue.largeVeneers.map((v, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700"
                                      >
                                        Layer {v.layer || i + 1}: {v.name || v.asset?.name || 'Color'}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Natural Timber (No Colored Veneers)</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Small Secondary Splices & Veneers */}
                          {(selectedOrder.cue.smallSpliceMaterial || (selectedOrder.cue.smallSplices && selectedOrder.cue.smallSplices > 0)) && (
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 col-span-1 sm:col-span-2">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 text-[10px]">Secondary Splices (Small Points)</span>
                                <span className="text-amber-400 font-bold text-[11px]">
                                  {selectedOrder.cue.smallSplices}-Splice {selectedOrder.cue.smallSpliceMaterial?.name || 'Secondary Splice'}
                                </span>
                              </div>
                              {selectedOrder.cue.smallVeneers && selectedOrder.cue.smallVeneers.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-800/80">
                                  <span className="text-slate-500 text-[10px] block mb-1">Secondary Veneer Layers:</span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {selectedOrder.cue.smallVeneers.map((v, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700"
                                      >
                                        Layer {v.layer || i + 1}: {v.name || v.asset?.name || 'Color'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Fittings, Extensions & Personalization */}
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                          3. Fittings, Extensions, Case & Engraving
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">End Butt Joint</span>
                            <span className={selectedOrder.cue.endButtJoin ? 'font-bold text-emerald-400' : 'font-semibold text-slate-400'}>
                              {selectedOrder.cue.endButtJoin ? 'Fitted Thread (+£12)' : 'None'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Dome Joint</span>
                            <span className={selectedOrder.cue.dome ? 'font-bold text-emerald-400' : 'font-semibold text-slate-400'}>
                              {selectedOrder.cue.dome ? 'Traditional Dome (+£31)' : 'None'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Disc Style</span>
                            <span className="font-bold text-white">
                              {selectedOrder.cue.namePlate?.name || 'Standard Disc Plate'}
                            </span>
                          </div>
                          {selectedOrder.cue.engraving && (
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-3">
                              <span className="text-slate-500 block text-[10px]">Custom Disc Engraving</span>
                              <span className="font-mono font-bold text-amber-400 text-sm">
                                &quot;{selectedOrder.cue.engraving}&quot;
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Typography Font: {selectedOrder.cue.font || 'Roboto'}
                              </span>
                            </div>
                          )}
                          {selectedOrder.cue.miniButt && (
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-500 block text-[10px]">Mini Butt</span>
                              <span className="font-bold text-white">{selectedOrder.cue.miniButt.name}</span>
                            </div>
                          )}
                          {selectedOrder.cue.extensions && selectedOrder.cue.extensions.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2">
                              <span className="text-slate-500 block text-[10px]">Extensions Included</span>
                              <span className="font-bold text-white">
                                {selectedOrder.cue.extensions.map((e) => e.name).join(', ')}
                              </span>
                            </div>
                          )}
                          {selectedOrder.cue.case && selectedOrder.cue.case.id !== 'case_none' && (
                            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 col-span-2 sm:col-span-3">
                              <span className="text-emerald-400 block text-[10px] font-bold">Bundled Tournament Cue Case</span>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="font-bold text-white text-xs">
                                  🧰 {selectedOrder.cue.case.name}
                                </span>
                                <span className="font-mono font-bold text-emerald-400">
                                  +£{selectedOrder.cue.case.bundlePrice}
                                </span>
                              </div>
                              {selectedOrder.cue.case.compartments && (
                                <span className="text-[10px] text-emerald-200/80 block mt-0.5">
                                  {selectedOrder.cue.case.compartments}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Financial & Invoice Itemized Breakdown */}
                      {selectedOrder.pricing && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                            Financial & Invoice Itemized Breakdown
                          </h5>
                          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1.5 divide-y divide-slate-800/60">
                            <div className="flex justify-between pt-1 text-slate-300">
                              <span>Shaft Wood ({selectedOrder.cue.shaft?.name || 'Shaft'}):</span>
                              <span className="font-mono">£{selectedOrder.pricing.shaftPrice || 0}</span>
                            </div>
                            <div className="flex justify-between pt-1 text-slate-300">
                              <span>Length & Butt Timber ({selectedOrder.cue.buttTimber?.name || 'Butt'}):</span>
                              <span className="font-mono">£{(selectedOrder.pricing.lengthPrice || 0) + (selectedOrder.pricing.buttTimberPrice || 0)}</span>
                            </div>
                            {Number(selectedOrder.pricing.largeSplicePrice) > 0 && (
                              <div className="flex justify-between pt-1 text-slate-300">
                                <span>Front Splices:</span>
                                <span className="font-mono">£{selectedOrder.pricing.largeSplicePrice}</span>
                              </div>
                            )}
                            {Number(selectedOrder.pricing.largeVeneersPrice) > 0 && (
                              <div className="flex justify-between pt-1 text-slate-300">
                                <span>Color Veneers:</span>
                                <span className="font-mono">£{selectedOrder.pricing.largeVeneersPrice}</span>
                              </div>
                            )}
                            {Number(selectedOrder.pricing.endButtJoinPrice) > 0 && (
                              <div className="flex justify-between pt-1 text-slate-300">
                                <span>End Butt Joint Fitting:</span>
                                <span className="font-mono">£{selectedOrder.pricing.endButtJoinPrice}</span>
                              </div>
                            )}
                            {Number(selectedOrder.pricing.domeJointPrice) > 0 && (
                              <div className="flex justify-between pt-1 text-slate-300">
                                <span>Dome Joint:</span>
                                <span className="font-mono">£{selectedOrder.pricing.domeJointPrice}</span>
                              </div>
                            )}
                            {Number(selectedOrder.pricing.engravingPrice) > 0 && (
                              <div className="flex justify-between pt-1 text-slate-300">
                                <span>Disc Engraving:</span>
                                <span className="font-mono">£{selectedOrder.pricing.engravingPrice}</span>
                              </div>
                            )}
                            {Number(selectedOrder.pricing.priorityServicePrice) > 0 && (
                              <div className="flex justify-between pt-1 text-amber-400 font-bold">
                                <span>⚡ Priority Fast-Track (6-Week Queue):</span>
                                <span className="font-mono">+£{selectedOrder.pricing.priorityServicePrice}</span>
                              </div>
                            )}
                            {Number(selectedOrder.pricing.casePrice) > 0 && (
                              <div className="flex justify-between pt-1 text-emerald-400 font-bold">
                                <span>Bundled Cue Case:</span>
                                <span className="font-mono">+£{selectedOrder.pricing.casePrice}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 text-sm font-black text-amber-400">
                              <span>Total Amount Payable:</span>
                              <span className="font-mono text-base">£{selectedOrder.pricing.total}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Workshop Spec</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Catalog Search & Bulk Tool (for shafts, splices, joints, cases, plates) */}
            {activeTab !== 'simulator' && activeTab !== 'orders' && activeTab !== 'users' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                {/* Live Filter Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search materials, grades, ferrules, lengths in real-time..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                      title="Clear filter"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Quick Bulk Adjustment Tool */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-semibold px-2 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                    <span>Bulk Adjust Tab:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => applyBulkAdjustment('percent', 5)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 text-xs font-mono font-bold border border-slate-700 transition-all"
                    title="Add +5% across this category"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkAdjustment('percent', 10)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 text-xs font-mono font-bold border border-slate-700 transition-all"
                    title="Add +10% across this category"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkAdjustment('percent', -5)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 text-xs font-mono font-bold border border-slate-700 transition-all"
                    title="Subtract -5% across this category"
                  >
                    -5%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkAdjustment('flat', 10)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 text-xs font-mono font-bold border border-slate-700 transition-all"
                    title="Add £10 flat across this category"
                  >
                    +£10
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 3: SHAFTS & LENGTHS */}
            {/* ======================================================== */}
            {activeTab === 'shafts' && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white">Shaft Wood & Timber Grades</h2>
                      <p className="text-xs text-slate-400">
                        Base cue prices based on ash grain straightness and maple timber selection.
                      </p>
                    </div>
                    <span className="text-xs text-amber-400 font-medium">Currency: {config.surcharges.defaultCurrency}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredShafts.map((shaft) => (
                      <div
                        key={shaft.id}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{shaft.name}</span>
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                            <input
                              type="checkbox"
                              checked={shaft.enabled !== false}
                              onChange={(e) => updateShaftPrice(shaft.id, shaft.price, e.target.checked)}
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-800"
                            />
                            <span>Active</span>
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-sm font-semibold">£</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={shaft.price}
                            onChange={(e) => updateShaftPrice(shaft.id, Number(e.target.value))}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Length Surcharges Section */}
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-white">Overall Cue Length Surcharges</h2>
                    <p className="text-xs text-slate-400">
                      Standard lengths (48” - 58”) are included (£0). Extra long lengths (58.5” - 63”) carry custom timber surcharges.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {filteredLengths.map((length) => (
                      <div
                        key={length.id}
                        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300">{length.name}</span>
                          <label className="flex items-center gap-1 cursor-pointer text-[10px] text-slate-400">
                            <input
                              type="checkbox"
                              checked={length.enabled !== false}
                              onChange={(e) => updateLengthPrice(length.id, length.price, e.target.checked)}
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3 w-3 bg-slate-800"
                            />
                            <span>Active</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-bold text-xs">£</span>
                          <input
                            type="number"
                            min="0"
                            value={length.price}
                            onChange={(e) => updateLengthPrice(length.id, Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 4: EXOTIC HARDWOOD SPLICES */}
            {/* ======================================================== */}
            {activeTab === 'splices' && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-white">Exotic Hardwood Splicing Rates</h2>
                    <p className="text-xs text-slate-400">
                      Set rates for 1-way single splice and 4-way full hand-splicing across all 12 exotic timbers.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="pb-3 font-semibold">Hardwood Timber</th>
                          <th className="pb-3 font-semibold">1-Splice Price (£)</th>
                          <th className="pb-3 font-semibold">4-Splice Price (£)</th>
                          <th className="pb-3 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {filteredSplices.map((splice) => (
                          <tr key={splice.id} className="hover:bg-slate-800/30">
                            <td className="py-3 font-medium text-slate-200">{splice.name}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-1.5 w-32">
                                <span className="text-slate-500 font-bold">£</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={splice.onePrice}
                                  onChange={(e) =>
                                    updateSplicePrice(splice.id, Number(e.target.value), splice.fourPrice)
                                  }
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1.5 w-32">
                                <span className="text-slate-500 font-bold">£</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={splice.fourPrice}
                                  onChange={(e) =>
                                    updateSplicePrice(splice.id, splice.onePrice, Number(e.target.value))
                                  }
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <label className="inline-flex items-center gap-1 cursor-pointer text-[11px] text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={splice.enabled !== false}
                                  onChange={(e) =>
                                    updateSplicePrice(
                                      splice.id,
                                      splice.onePrice,
                                      splice.fourPrice,
                                      e.target.checked
                                    )
                                  }
                                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-800"
                                />
                                <span>{splice.enabled !== false ? 'Active' : 'Disabled'}</span>
                              </label>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 5: JOINTS & FITTINGS */}
            {/* ======================================================== */}
            {activeTab === 'joints' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Joint Fitting Surcharges */}
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white">Precision Joint Fitting Surcharges</h2>
                    <p className="text-xs text-slate-400">
                      Precision machining fee for Butt Joint and Dome Joint fittings.
                    </p>

                    <div className="space-y-4 pt-2">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-200">End Butt Joint Fitting</div>
                          <div className="text-[11px] text-slate-500">Brass male/female thread for mini-butts</div>
                        </div>
                        <div className="flex items-center gap-1.5 w-28">
                          <span className="text-slate-500 font-bold">£</span>
                          <input
                            type="number"
                            min="0"
                            value={config.surcharges.buttJointFittingPrice}
                            onChange={(e) => updateSurcharges('buttJointFittingPrice', Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-200">Dome Joint Surcharge</div>
                          <div className="text-[11px] text-slate-500">Traditional rounded timber dome</div>
                        </div>
                        <div className="flex items-center gap-1.5 w-28">
                          <span className="text-slate-500 font-bold">£</span>
                          <input
                            type="number"
                            min="0"
                            value={config.surcharges.domeJointPrice}
                            onChange={(e) => updateSurcharges('domeJointPrice', Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span>⚡ Priority Crafting Service</span>
                            <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">6 Weeks</span>
                          </div>
                          <div className="text-[11px] text-slate-500">Expedited queue slot (guaranteed 6-week completion)</div>
                        </div>
                        <div className="flex items-center gap-1.5 w-28">
                          <span className="text-slate-500 font-bold">£</span>
                          <input
                            type="number"
                            min="0"
                            value={config.surcharges.priorityCraftingPrice ?? 40}
                            onChange={(e) => updateSurcharges('priorityCraftingPrice', Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ferrules */}
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white">Ferrules Selection</h2>
                    <p className="text-xs text-slate-400">
                      Tip ferrule machining materials.
                    </p>

                    <div className="space-y-3 pt-2">
                      {filteredFerrules.map((ferrule) => (
                        <div
                          key={ferrule.id}
                          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">{ferrule.name}</span>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                              <input
                                type="checkbox"
                                checked={ferrule.enabled !== false}
                                onChange={(e) => updateFerrulePrice(ferrule.id, ferrule.price, e.target.checked)}
                                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-800"
                              />
                              <span>Active</span>
                            </label>
                          </div>
                          <div className="flex items-center gap-1.5 w-28">
                            <span className="text-slate-500 font-bold">£</span>
                            <input
                              type="number"
                              min="0"
                              value={ferrule.price}
                              onChange={(e) => updateFerrulePrice(ferrule.id, Number(e.target.value))}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 6: CUE & CASE BUNDLES */}
            {/* ======================================================== */}
            {activeTab === 'cases' && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-amber-400" />
                        <span>Tournament Cue Case Bundles (5 Models)</span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Set discounted bundle rates and active/inactive status for cases when purchased alongside a bespoke cue.
                      </p>
                    </div>
                    <span className="text-xs text-amber-400 font-medium">
                      Currency: {config.surcharges.defaultCurrency || '£'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {filteredCases.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => updateCaseItem(c.id, { name: e.target.value })}
                            className="text-xs font-bold text-slate-200 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none flex-1 truncate"
                            title="Click to rename case bundle"
                          />
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 shrink-0">
                            <input
                              type="checkbox"
                              checked={c.enabled !== false}
                              onChange={(e) => updateCaseItem(c.id, { enabled: e.target.checked })}
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-800"
                            />
                            <span>Active</span>
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <span className="text-[11px] text-slate-500">Bundle Price:</span>
                          <div className="flex items-center gap-1.5 w-32">
                            <span className="text-slate-500 font-bold">£</span>
                            <input
                              type="number"
                              min="0"
                              value={c.price}
                              onChange={(e) => updateCaseItem(c.id, { price: Number(e.target.value) })}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 7: DISCS & EXTRAS */}
            {/* ======================================================== */}
            {activeTab === 'plates' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Plates & Discs */}
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white">Butt Plates & Discs</h2>
                    <p className="text-xs text-slate-400">
                      Disc branding and personalised engraved name plate pricing.
                    </p>

                    <div className="space-y-3 pt-2">
                      {filteredPlates.map((plate) => (
                        <div
                          key={plate.id}
                          className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200">{plate.name}</span>
                            <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-400">
                              <input
                                type="checkbox"
                                checked={plate.enabled !== false}
                                onChange={(e) =>
                                  updatePlatePrice(
                                    plate.id,
                                    plate.price,
                                    plate.engravingPrice || 0,
                                    e.target.checked
                                  )
                                }
                                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-800"
                              />
                              <span>Active</span>
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-500 block mb-1">Plate Price</label>
                              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                                <span className="text-slate-500 font-bold text-xs">£</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={plate.price}
                                  onChange={(e) =>
                                    updatePlatePrice(
                                      plate.id,
                                      Number(e.target.value),
                                      plate.engravingPrice || 0
                                    )
                                  }
                                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex-1">
                              <label className="text-[10px] text-slate-500 block mb-1">Engraving Surcharge</label>
                              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                                <span className="text-slate-500 font-bold text-xs">£</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={plate.engravingPrice || 0}
                                  onChange={(e) =>
                                    updatePlatePrice(
                                      plate.id,
                                      plate.price,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extensions & Mini Butts */}
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white">Extensions & Mini Butts</h2>
                    <p className="text-xs text-slate-400">
                      Accessories compatible when End Butt Joint is active.
                    </p>

                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-semibold text-amber-400">Mini Butts</div>
                      {filteredMiniButts.map((m) => (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-slate-200">{m.name}</span>
                          <div className="flex items-center gap-1.5 w-28">
                            <span className="text-slate-500 font-bold">£</span>
                            <input
                              type="number"
                              min="0"
                              value={m.price}
                              onChange={(e) => updateMiniButtPrice(m.id, Number(e.target.value))}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                            />
                          </div>
                        </div>
                      ))}

                      <div className="text-xs font-semibold text-amber-400 pt-2">Telescopic Extensions</div>
                      {filteredExtensions.map((e) => (
                        <div
                          key={e.id}
                          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-slate-200">{e.name}</span>
                          <div className="flex items-center gap-1.5 w-28">
                            <span className="text-slate-500 font-bold">£</span>
                            <input
                              type="number"
                              min="0"
                              value={e.price}
                              onChange={(ev) => updateExtensionPrice(e.id, Number(ev.target.value))}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 8: LIVE SANITY SIMULATOR */}
            {/* ======================================================== */}
            {activeTab === 'simulator' && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-6">
                  <div>
                    <h2 className="text-sm font-bold text-white">Live Calculation Sanity Simulator</h2>
                    <p className="text-xs text-slate-400">
                      Verify how your active edits in this admin panel will calculate real orders before hitting Save.
                    </p>
                  </div>

                  {/* Preset Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSimPreset('standard')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        simPreset === 'standard'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Test 1: Standard 1-Piece Ash Executive
                    </button>
                    <button
                      onClick={() => setSimPreset('tournament')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        simPreset === 'tournament'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Test 2: Tournament 3/4 Joint (+End Butt Fitting)
                    </button>
                    <button
                      onClick={() => setSimPreset('exotic')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        simPreset === 'exotic'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Test 3: Exotic 4-Splice Snakewood (+Professional)
                    </button>
                  </div>

                  {/* Calculation Breakdown Card */}
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <span className="text-xs font-bold text-slate-300">Itemized Formula Calculation</span>
                      <span className="text-xs text-emerald-400 font-semibold">100% Verified Logic</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500 block text-[11px]">Shaft Timber</span>
                        <span className="text-sm font-bold text-white">£{simPricing.shaftPrice}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500 block text-[11px]">Butt Timber</span>
                        <span className="text-sm font-bold text-white">£{simPricing.buttTimberPrice}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500 block text-[11px]">Hardwood Splicing</span>
                        <span className="text-sm font-bold text-white">£{simPricing.largeSplicePrice}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500 block text-[11px]">Butt Joint Machining</span>
                        <span className="text-sm font-bold text-white">£{simPricing.endButtJoinPrice}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <span className="text-sm font-bold text-slate-300">Simulated Total Price</span>
                      <div className="text-2xl font-black text-amber-400">
                        £{simPricing.total}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
