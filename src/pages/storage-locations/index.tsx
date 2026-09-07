import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Empty,
  Spin,
  Segmented,
  Table,
} from 'antd';
import {
  HddOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  BlockOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { storageApi } from '../../services/api';
import type { StorageShelf, StorageRack } from '../../types/storage';
import { AppLayout } from '../../components/layout/AppLayout';

export const StorageLocationsPage: React.FC = () => {
  const [shelves, setShelves] = useState<StorageShelf[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');

  // Shelf Modal State
  const [isShelfModalOpen, setIsShelfModalOpen] = useState<boolean>(false);
  const [editingShelf, setEditingShelf] = useState<StorageShelf | null>(null);

  // Rack Modal State
  const [isRackModalOpen, setIsRackModalOpen] = useState<boolean>(false);
  const [editingRack, setEditingRack] = useState<StorageRack | null>(null);
  const [targetShelfId, setTargetShelfId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);

  const [shelfForm] = Form.useForm();
  const [rackForm] = Form.useForm();

  const fetchShelves = async () => {
    setLoading(true);
    try {
      const res = await storageApi.getAllShelves();
      if (res.success && res.shelves) {
        setShelves(res.shelves);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch storage layout');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelves();
  }, []);

  // Extract unique Store Zones
  const zones = useMemo(() => {
    const set = new Set<string>();
    shelves.forEach((s) => {
      if (s.zone) set.add(s.zone);
    });
    return Array.from(set);
  }, [shelves]);

  // Filtered Shelves based on search & zone filter
  const filteredShelves = useMemo(() => {
    return shelves.filter((shelf) => {
      const matchesZone = selectedZone === 'ALL' || shelf.zone === selectedZone;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesZone;

      const matchesShelf =
        shelf.code.toLowerCase().includes(q) ||
        shelf.name.toLowerCase().includes(q) ||
        (shelf.zone && shelf.zone.toLowerCase().includes(q)) ||
        (shelf.description && shelf.description.toLowerCase().includes(q));

      const matchesRack = (shelf.racks || []).some(
        (r) => r.rack_code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
      );

      return matchesZone && (matchesShelf || matchesRack);
    });
  }, [shelves, selectedZone, searchQuery]);

  // Overall Statistics
  const totalRacks = useMemo(() => {
    return shelves.reduce((acc, s) => acc + (s.racks?.length || 0), 0);
  }, [shelves]);

  // Sync Shelf Modal fields
  useEffect(() => {
    if (isShelfModalOpen) {
      if (editingShelf) {
        shelfForm.setFieldsValue({
          code: editingShelf.code,
          name: editingShelf.name,
          zone: editingShelf.zone,
          description: editingShelf.description,
        });
      } else {
        shelfForm.resetFields();
      }
    }
  }, [isShelfModalOpen, editingShelf, shelfForm]);

  // Sync Rack Modal fields
  useEffect(() => {
    if (isRackModalOpen) {
      if (editingRack) {
        rackForm.setFieldsValue({
          shelf_id: editingRack.shelf_id,
          rack_code: editingRack.rack_code,
          name: editingRack.name,
          capacity_notes: editingRack.capacity_notes,
        });
      } else {
        rackForm.resetFields();
        if (targetShelfId) {
          rackForm.setFieldsValue({ shelf_id: targetShelfId });
        }
      }
    }
  }, [isRackModalOpen, editingRack, targetShelfId, rackForm]);

  // Shelf Submit Handler
  const handleShelfSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingShelf) {
        const res = await storageApi.updateShelf(editingShelf.id, values);
        if (res.success) {
          message.success('Shelf updated successfully!');
          setIsShelfModalOpen(false);
          setEditingShelf(null);
          fetchShelves();
        }
      } else {
        const res = await storageApi.createShelf(values);
        if (res.success) {
          message.success('New Shelf created successfully!');
          setIsShelfModalOpen(false);
          fetchShelves();
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to save shelf');
    } finally {
      setSubmitting(false);
    }
  };

  // Rack Submit Handler
  const handleRackSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingRack) {
        const res = await storageApi.updateRack(editingRack.id, values);
        if (res.success) {
          message.success('Rack updated successfully!');
          setIsRackModalOpen(false);
          setEditingRack(null);
          fetchShelves();
        }
      } else {
        const res = await storageApi.createRack(values);
        if (res.success) {
          message.success('New Rack added to Shelf!');
          setIsRackModalOpen(false);
          fetchShelves();
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to save rack');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handlers
  const handleDeleteShelf = async (id: number) => {
    try {
      const res = await storageApi.deleteShelf(id);
      if (res.success) {
        message.success('Shelf and its racks removed');
        fetchShelves();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete shelf');
    }
  };

  const handleDeleteRack = async (id: number) => {
    try {
      const res = await storageApi.deleteRack(id);
      if (res.success) {
        message.success('Rack removed');
        fetchShelves();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete rack');
    }
  };

  // Table Columns View
  const tableColumns: ColumnsType<any> = [
    {
      title: 'Shelf Code & Name',
      key: 'shelf',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center justify-center text-xs">
            {record.shelfCode}
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100">{record.shelfName}</div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <EnvironmentOutlined className="text-cyan-500" />
              <span>{record.shelfZone || 'General Zone'}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Rack / Bin Code',
      key: 'rack_code',
      render: (_, record) =>
        record.rackCode ? (
          <Tag color="purple" className="font-mono font-bold px-2.5 py-0.5 border-purple-300">
            {record.rackCode}
          </Tag>
        ) : (
          <span className="text-xs text-slate-400 italic">No Racks</span>
        ),
    },
    {
      title: 'Rack Name / Description',
      key: 'rack_name',
      render: (_, record) => record.rackName || <span className="text-xs text-slate-400">-</span>,
    },
    {
      title: 'Capacity / Notes',
      key: 'capacity',
      render: (_, record) =>
        record.capacity ? (
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <InfoCircleOutlined className="text-indigo-400" />
            {record.capacity}
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
          {record.isRack ? (
            <>
              <Tooltip title="Edit Rack">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  className="text-indigo-600"
                  onClick={() => {
                    setEditingRack(record.rawRack);
                    setIsRackModalOpen(true);
                  }}
                />
              </Tooltip>
              <Popconfirm title="Delete Rack?" onConfirm={() => handleDeleteRack(record.rawRack.id)}>
                <Button type="text" danger icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            </>
          ) : (
            <>
              <Tooltip title="Add Rack to Shelf">
                <Button
                  type="text"
                  icon={<PlusOutlined className="text-emerald-600" />}
                  size="small"
                  onClick={() => {
                    setEditingRack(null);
                    setTargetShelfId(record.rawShelf.id);
                    setIsRackModalOpen(true);
                  }}
                />
              </Tooltip>
              <Tooltip title="Edit Shelf">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  className="text-indigo-600"
                  onClick={() => {
                    setEditingShelf(record.rawShelf);
                    setIsShelfModalOpen(true);
                  }}
                />
              </Tooltip>
              <Popconfirm title="Delete Shelf?" onConfirm={() => handleDeleteShelf(record.rawShelf.id)}>
                <Button type="text" danger icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  // Flatten data for table view
  const tableData = useMemo(() => {
    const list: any[] = [];
    filteredShelves.forEach((s) => {
      if (!s.racks || s.racks.length === 0) {
        list.push({
          key: `shelf-${s.id}`,
          shelfCode: s.code,
          shelfName: s.name,
          shelfZone: s.zone,
          rackCode: null,
          rackName: null,
          capacity: null,
          isRack: false,
          rawShelf: s,
        });
      } else {
        s.racks.forEach((r) => {
          list.push({
            key: `rack-${r.id}`,
            shelfCode: s.code,
            shelfName: s.name,
            shelfZone: s.zone,
            rackCode: r.rack_code,
            rackName: r.name,
            capacity: r.capacity_notes,
            isRack: true,
            rawRack: r,
            rawShelf: s,
          });
        });
      }
    });
    return list;
  }, [filteredShelves]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Clean Light Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl shrink-0">
              <HddOutlined />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-1">
                Store Shelves & Racks Layout
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Configure physical store room shelves, racks, and bin positions
              </p>
            </div>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="middle"
            className="bg-indigo-600 hover:bg-indigo-500 font-bold border-none shadow-md"
            onClick={() => {
              setEditingShelf(null);
              setIsShelfModalOpen(true);
            }}
          >
            Create Shelf
          </Button>
        </div>

        {/* Search, Filter & View Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <Input
              placeholder="Search shelf code, rack code, name or zone..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
              allowClear
              size="large"
            />

            <Select
              value={selectedZone}
              onChange={(v) => setSelectedZone(v)}
              size="large"
              className="w-48"
            >
              <Select.Option value="ALL">All Store Zones ({shelves.length})</Select.Option>
              {zones.map((z) => (
                <Select.Option key={z} value={z}>
                  📍 {z}
                </Select.Option>
              ))}
            </Select>

            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 font-mono ml-2">
              <Tag color="blue" className="px-2 py-0.5 font-bold">
                {shelves.length} Shelves
              </Tag>
              <Tag color="purple" className="px-2 py-0.5 font-bold">
                {totalRacks} Racks & Bins
              </Tag>
            </div>
          </div>

          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as 'grid' | 'table')}
            size="large"
            options={[
              {
                value: 'grid',
                icon: <BlockOutlined />,
                label: '3D Physical Rack Stand View',
              },
              {
                value: 'table',
                icon: <UnorderedListOutlined />,
                label: 'Table List',
              },
            ]}
          />
        </div>

        {/* Content View */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" tip="Loading Store Storage Layout..." />
          </div>
        ) : filteredShelves.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-12 text-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="space-y-2">
                  <p className="text-slate-600 dark:text-slate-300 font-bold text-base">
                    No Store Shelves Configured Yet
                  </p>
                  <p className="text-slate-400 text-sm">
                    {searchQuery || selectedZone !== 'ALL'
                      ? 'Try clearing your search or zone filters'
                      : 'Start by creating your first shelf cabinet (e.g. Shelf A - Electrical Section)'}
                  </p>
                </div>
              }
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                className="mt-4 bg-indigo-600 font-bold"
                onClick={() => {
                  setEditingShelf(null);
                  setIsShelfModalOpen(true);
                }}
              >
                Create First Shelf
              </Button>
            </Empty>
          </Card>
        ) : viewMode === 'table' ? (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <Table
              columns={tableColumns}
              dataSource={tableData}
              pagination={{ pageSize: 12, showSizeChanger: true }}
              className="rounded-lg overflow-hidden"
            />
          </Card>
        ) : (
          /* STUNNING 3D-STYLE PHYSICAL SHELF RACK STAND VISUALIZER (LIGHT THEME) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredShelves.map((shelf) => {
              const racks = shelf.racks || [];

              return (
                <div
                  key={shelf.id}
                  className="bg-white dark:bg-slate-900 border-x-8 border-x-slate-200 dark:border-x-slate-800 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col relative group border-t-2 border-b-4 border-t-indigo-500 border-b-slate-300 dark:border-b-slate-700"
                >
                  {/* Left & Right Metallic Slot Pillars Visual Accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-r border-slate-300 dark:border-slate-700 flex flex-col items-center justify-around py-6 z-20 pointer-events-none">
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-l from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-l border-slate-300 dark:border-slate-700 flex flex-col items-center justify-around py-6 z-20 pointer-events-none">
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                  </div>

                  {/* 3D Metallic Top Header Beam */}
                  <div className="bg-gradient-to-r from-slate-100 via-indigo-50/50 to-slate-100 dark:from-slate-850 dark:via-indigo-950/40 dark:to-slate-850 p-5 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-mono font-black flex items-center justify-center text-sm shadow-md border border-indigo-400/40 shrink-0">
                        {shelf.code}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 dark:text-slate-100 text-base leading-tight">
                          {shelf.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {shelf.zone ? (
                            <Tag color="cyan" className="font-semibold text-[11px] px-2 py-0 rounded-md border-cyan-300">
                              <EnvironmentOutlined /> {shelf.zone}
                            </Tag>
                          ) : (
                            <Tag color="default" className="text-[10px] px-1.5 py-0">GENERAL ZONE</Tag>
                          )}
                          <span className="text-xs text-slate-400 font-mono font-medium">
                            {racks.length} {racks.length === 1 ? 'Bin Slot' : 'Bin Slots'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Tooltip title="Add Rack Bin to Shelf">
                        <Button
                          type="text"
                          icon={<PlusOutlined className="text-emerald-600 font-bold" />}
                          size="small"
                          onClick={() => {
                            setEditingRack(null);
                            setTargetShelfId(shelf.id);
                            setIsRackModalOpen(true);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Edit Shelf Details">
                        <Button
                          type="text"
                          icon={<EditOutlined className="text-indigo-600" />}
                          size="small"
                          onClick={() => {
                            setEditingShelf(shelf);
                            setIsShelfModalOpen(true);
                          }}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Delete Shelf?"
                        description="This will also delete all racks inside this shelf."
                        onConfirm={() => handleDeleteShelf(shelf.id)}
                        okText="Yes, Delete"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Delete Shelf">
                          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  </div>

                  {shelf.description && (
                    <div className="px-5 py-2 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      💡 {shelf.description}
                    </div>
                  )}

                  {/* Physical Tier Levels Container */}
                  <div className="p-5 flex-1 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                        <AppstoreOutlined className="text-indigo-500" />
                        <span>3D SHELF TIERS & BIN DRAWER SLOTS</span>
                      </div>

                      <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<PlusOutlined />}
                        className="border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold text-xs rounded-lg px-2.5"
                        onClick={() => {
                          setEditingRack(null);
                          setTargetShelfId(shelf.id);
                          setIsRackModalOpen(true);
                        }}
                      >
                        + Add Bin
                      </Button>
                    </div>

                    {racks.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center bg-white dark:bg-slate-900/80 my-2">
                        <ContainerOutlined className="text-3xl text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="text-xs text-slate-400 font-medium mb-3">No bin slots created on this shelf stand</p>
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          size="small"
                          onClick={() => {
                            setEditingRack(null);
                            setTargetShelfId(shelf.id);
                            setIsRackModalOpen(true);
                          }}
                          className="text-indigo-600 border-indigo-300 font-medium text-xs"
                        >
                          + Add First Bin Slot
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {racks.map((rack, idx) => (
                          <div key={rack.id} className="relative">
                            {/* Horizontal Steel Tier Support Line */}
                            <div className="text-[10px] font-mono font-bold text-slate-400 mb-1.5 flex items-center justify-between px-1">
                              <span>TIER LEVEL {idx + 1}</span>
                              <span className="text-slate-400 font-normal">SLOT R-{idx + 1}</span>
                            </div>

                            {/* 3D Physical Storage Drawer Box */}
                            <div className="bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 relative group/drawer transform hover:-translate-y-0.5">
                              {/* 3D Top Drawer Bevel Lip Line */}
                              <div className="absolute top-0 left-3 right-3 h-1 bg-indigo-500/20 rounded-b-md"></div>

                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                                      {rack.rack_code}
                                    </span>
                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                      {rack.name}
                                    </span>
                                  </div>
                                  {rack.capacity_notes && (
                                    <div className="text-[11px] text-slate-400 font-medium mt-2 flex items-center gap-1">
                                      <InfoCircleOutlined className="text-indigo-400 text-[10px]" />
                                      <span>{rack.capacity_notes}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-0.5 opacity-80 group-hover/drawer:opacity-100 shrink-0">
                                  <Tooltip title="Edit Bin">
                                    <Button
                                      type="text"
                                      icon={<EditOutlined style={{ fontSize: '12px' }} />}
                                      size="small"
                                      className="text-slate-400 hover:text-indigo-600"
                                      onClick={() => {
                                        setEditingRack(rack);
                                        setIsRackModalOpen(true);
                                      }}
                                    />
                                  </Tooltip>
                                  <Popconfirm
                                    title="Delete Bin Slot?"
                                    onConfirm={() => handleDeleteRack(rack.id)}
                                    okText="Delete"
                                    okButtonProps={{ danger: true }}
                                  >
                                    <Tooltip title="Delete Bin">
                                      <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                                        size="small"
                                      />
                                    </Tooltip>
                                  </Popconfirm>
                                </div>
                              </div>

                              {/* Drawer Pull Handle Visual Feature */}
                              <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-2 group-hover/drawer:bg-indigo-400 transition-colors"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ground Base Metallic Plate Footer */}
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 text-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 tracking-widest uppercase border-t border-slate-200 dark:border-slate-700">
                    ══ SHELF STAND BASE ══
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Shelf Create / Edit Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
              <HddOutlined />
              <span>{editingShelf ? 'Edit Storage Shelf Stand' : 'Create New Storage Shelf Stand'}</span>
            </div>
          }
          open={isShelfModalOpen}
          onCancel={() => {
            setIsShelfModalOpen(false);
            setEditingShelf(null);
          }}
          footer={null}
          destroyOnClose
          centered
        >
          <Form form={shelfForm} layout="vertical" onFinish={handleShelfSubmit} className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="code"
                label="Shelf Code"
                rules={[{ required: true, message: 'Please enter shelf code (e.g. SH-A1)' }]}
              >
                <Input placeholder="e.g. SH-A1" size="large" className="font-mono font-bold" />
              </Form.Item>

              <Form.Item
                name="name"
                label="Shelf Name"
                rules={[{ required: true, message: 'Please enter shelf name' }]}
              >
                <Input placeholder="e.g. Shelf A - Circuit Breakers" size="large" />
              </Form.Item>
            </div>

            <Form.Item name="zone" label="Store Zone / Bay">
              <Input placeholder="e.g. Section 1 / Main Store Room" size="large" />
            </Form.Item>

            <Form.Item name="description" label="Description / Notes">
              <Input.TextArea placeholder="Optional notes about what goes on this shelf..." rows={3} />
            </Form.Item>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => {
                  setIsShelfModalOpen(false);
                  setEditingShelf(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                className="bg-indigo-600 hover:bg-indigo-500 font-bold"
              >
                {editingShelf ? 'Update Shelf' : 'Create Shelf Stand'}
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Rack Create / Edit Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
              <AppstoreOutlined />
              <span>{editingRack ? 'Edit Storage Bin Slot' : 'Add New Bin Slot to Shelf'}</span>
            </div>
          }
          open={isRackModalOpen}
          onCancel={() => {
            setIsRackModalOpen(false);
            setEditingRack(null);
          }}
          footer={null}
          destroyOnClose
          centered
        >
          <Form form={rackForm} layout="vertical" onFinish={handleRackSubmit} className="mt-4">
            <Form.Item
              name="shelf_id"
              label="Belongs to Shelf Cabinet Stand"
              rules={[{ required: true, message: 'Please select a shelf' }]}
            >
              <Select placeholder="Choose shelf..." size="large">
                {shelves.map((s) => (
                  <Select.Option key={s.id} value={s.id}>
                    <span className="font-mono font-bold text-indigo-600">[{s.code}]</span> {s.name}{' '}
                    {s.zone ? `(${s.zone})` : ''}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="rack_code"
                label="Rack / Bin Code"
                rules={[{ required: true, message: 'Please enter rack code (e.g. R-01)' }]}
              >
                <Input placeholder="e.g. R-01" size="large" className="font-mono font-bold" />
              </Form.Item>

              <Form.Item
                name="name"
                label="Rack Name / Level"
                rules={[{ required: true, message: 'Please enter rack name' }]}
              >
                <Input placeholder="e.g. Rack A-1 (Top Level)" size="large" />
              </Form.Item>
            </div>

            <Form.Item name="capacity_notes" label="Capacity / Weight Notes">
              <Input placeholder="e.g. Max weight 200kg / Heavy items" size="large" />
            </Form.Item>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => {
                  setIsRackModalOpen(false);
                  setEditingRack(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                className="bg-indigo-600 hover:bg-indigo-500 font-bold"
              >
                {editingRack ? 'Update Bin' : 'Add Bin Slot'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default StorageLocationsPage;
