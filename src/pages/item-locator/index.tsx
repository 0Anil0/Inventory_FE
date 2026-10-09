import React, { useState, useEffect } from 'react';
import { Card, Input, Table, Tag, Empty } from 'antd';
import { SearchOutlined, EnvironmentOutlined, BarcodeOutlined } from '@ant-design/icons';
import { inventoryApi } from '../../services/api';
import type { ProjectInventory } from '../../types/inventory';
import { AppLayout } from '../../components/layout/AppLayout';
import type { ColumnsType } from 'antd/es/table';

export const ItemLocatorPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ProjectInventory[]>([]);

  // Function to search items
  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      // projectId: -1 fetches all locations in the active plant
      const res = await inventoryApi.getByProject(-1, { search: value, limit: 50 });
      if (res.success && res.inventory) {
        setResults(res.inventory.filter((item: ProjectInventory) => item.quantity > 0)); // Only show items with stock
      }
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const columns: ColumnsType<ProjectInventory> = [
    {
      title: 'Item Details',
      key: 'item',
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-800 dark:text-slate-100 font-['Outfit'] text-base">
            {record.item_type?.name || 'Unnamed Item'}
          </span>
          <div className="flex gap-2 text-xs font-mono">
            <span className="text-indigo-600 dark:text-indigo-400">Code: {record.item_type?.code}</span>
            {record.item_type?.cat_no && (
              <span className="text-slate-500">| Cat: {record.item_type.cat_no}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Available Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number, record) => (
        <Tag color="emerald" className="font-mono text-sm font-bold border-none px-3 py-1">
          {qty.toLocaleString()} {record.item_type?.unit || 'pcs'}
        </Tag>
      ),
    },
    {
      title: 'Project / Site',
      key: 'project',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <EnvironmentOutlined className="text-rose-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {record.project_id === null ? '📦 General Stock / Main Store' : record.project?.name}
          </span>
        </div>
      ),
    },
    {
      title: 'Exact Location (Shelf / Rack)',
      key: 'location',
      render: (_, record) => (
        <div>
          {record.shelf ? (
            <div className="flex flex-col gap-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg p-2 border border-indigo-100 dark:border-indigo-500/20 w-fit">
              <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-sm">
                <BarcodeOutlined className="text-indigo-500" /> Shelf: {record.shelf.name} <span className="text-[11px] text-slate-500 font-mono">({record.shelf.code})</span>
              </span>
              {record.rack && (
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1 ml-5">
                  ↳ Rack: {record.rack.name} ({record.rack.rack_code})
                </span>
              )}
            </div>
          ) : (
            <Tag className="border-dashed bg-slate-50 text-slate-400 border-slate-200">
              No specific shelf assigned
            </Tag>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 min-h-screen overflow-y-auto pb-12">
        
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-md dark:shadow-2xl transition-colors duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <SearchOutlined className="text-2xl text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Global Stock Item Locator
              </h1>
              <p className="text-xs app-text-muted mb-0">
                Instantly search for any material item across all projects and general stock to find its exact physical shelf or rack location.
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <div className="mb-4">
            <Input
              size="large"
              placeholder="Search by Item Name, Code, or Catalog Number..."
              prefix={<SearchOutlined className="text-indigo-500 text-xl mr-2" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="h-14 text-base rounded-xl font-['Outfit'] shadow-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>

        {searchQuery.trim() === '' ? (
            <Empty
              description={
                <span className="text-slate-400">Start typing an item name or code to find its location</span>
              }
              className="py-12"
            />
        ) : (
            <Table
              columns={columns}
              dataSource={results}
              rowKey="id"
              loading={loading}
              pagination={false}
              locale={{ emptyText: 'No items found matching your search.' }}
            />
        )}
        </Card>
      </main>
    </AppLayout>
  );
};
export default ItemLocatorPage;
