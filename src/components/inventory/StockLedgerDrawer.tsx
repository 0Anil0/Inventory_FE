import React, { useEffect, useState } from 'react';
import { Drawer, Table, Tag, Button, Spin, message } from 'antd';
import {
  HistoryOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { StockMovement } from '../../types/inventory';
import { stockMovementApi } from '../../services/api';

interface StockLedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number | null;
  projectName?: string;
}

export const StockLedgerDrawer: React.FC<StockLedgerDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await stockMovementApi.getAll({
        project_id: projectId || undefined,
        limit: 100,
      });
      if (res.success && res.movements) {
        setMovements(res.movements);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch stock movement audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMovements();
    }
  }, [isOpen, projectId]);

  const getTypeTag = (type: StockMovement['type']) => {
    switch (type) {
      case 'IN':
        return (
          <Tag icon={<ArrowUpOutlined />} color="success" className="font-bold border-none">
            STOCK IN (+ADD)
          </Tag>
        );
      case 'OUT':
        return (
          <Tag icon={<ArrowDownOutlined />} color="error" className="font-bold border-none">
            STOCK OUT (-REMOVE)
          </Tag>
        );
      case 'TRANSFER':
        return (
          <Tag icon={<SwapOutlined />} color="processing" className="font-bold border-none">
            TRANSFER
          </Tag>
        );
      case 'SET':
      default:
        return (
          <Tag color="purple" className="font-bold border-none">
            SET / ADJUST
          </Tag>
        );
    }
  };

  const columns: ColumnsType<StockMovement> = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (dateStr?: string) => (
        <span className="text-xs text-slate-400 font-mono">
          {dateStr ? new Date(dateStr).toLocaleString() : 'N/A'}
        </span>
      ),
    },
    {
      title: 'Project',
      key: 'project',
      width: 140,
      render: (_, record) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {record.project?.name || `Project #${record.project_id}`}
        </span>
      ),
    },
    {
      title: 'Item Type',
      key: 'item',
      render: (_, record) => (
        <div>
          <div className="font-bold text-indigo-500">{record.item_type?.name || 'Item'}</div>
          <div className="text-xs text-slate-400 font-mono">{record.item_type?.code}</div>
        </div>
      ),
    },
    {
      title: 'Action Type',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: StockMovement['type']) => getTypeTag(type),
    },
    {
      title: 'Qty Change',
      key: 'quantity',
      render: (_, record) => (
        <div className="font-mono">
          <div className="text-sm font-bold text-slate-100">
            {record.quantity.toLocaleString()} {record.item_type?.unit || 'pcs'}
          </div>
          <div className="text-xs text-slate-400">
            {record.previous_quantity} ➔ {record.new_quantity}
          </div>
        </div>
      ),
    },
    {
      title: 'User & Notes',
      key: 'user_notes',
      render: (_, record) => (
        <div>
          <div className="text-xs text-slate-300 flex items-center gap-1">
            <UserOutlined className="text-indigo-400" />
            <span>{record.user?.username || 'System / Admin'}</span>
          </div>
          {record.notes && <div className="text-xs text-slate-400 italic mt-0.5">{record.notes}</div>}
        </div>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <HistoryOutlined className="text-indigo-400 text-lg" />
            <span className="font-bold">
              Stock Movement Ledger Audit Trail {projectName ? `(${projectName})` : ''}
            </span>
          </div>
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchMovements} loading={loading} />
        </div>
      }
      width={850}
      open={isOpen}
      onClose={onClose}
      destroyOnClose
    >
      {loading ? (
        <div className="py-12 text-center">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={movements}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} log entries`,
          }}
          size="small"
        />
      )}
    </Drawer>
  );
};
