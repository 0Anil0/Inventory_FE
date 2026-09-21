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
      const reqProjectId =
        projectId !== undefined && projectId !== null && projectId !== -1
          ? projectId
          : undefined;

      const res = await stockMovementApi.getAll({
        project_id: reqProjectId,
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

  const parseTransferNotes = (notes?: string) => {
    if (!notes) return { ref: null, text: null, lot: null, remarks: null };

    const refMatch = notes.match(/\[Ref:\s*([^\]]+)\]/);
    const ref = refMatch ? refMatch[1] : null;
    const cleanNotes = notes.replace(/\[Ref:\s*([^\]]+)\]/, '').trim();

    const parts = cleanNotes.split('|').map((s) => s.trim());
    const text = parts[0] || '';
    const lot = parts.find((p) => p.startsWith('Lot #'));
    const remarks = parts.slice(1).filter((p) => !p.startsWith('Lot #')).join(' | ');

    return { ref, text, lot, remarks };
  };

  const columns: ColumnsType<StockMovement> = [
    {
      title: 'Timestamp & Ref',
      key: 'time',
      width: 160,
      render: (_, record) => {
        const parsed = parseTransferNotes(record.notes);
        return (
          <div>
            <div className="text-xs text-slate-400 font-mono">
              {record.createdAt ? new Date(record.createdAt).toLocaleString('en-IN') : 'N/A'}
            </div>
            {parsed.ref && (
              <Tag color="purple" className="font-mono text-[10px] font-bold border-none mt-1">
                {parsed.ref}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Project Location',
      key: 'project',
      width: 160,
      render: (_, record) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
          {record.project?.name || (record.project_id === null || record.project_id === 0 ? 'General Stock / Main Store' : `Project #${record.project_id}`)}
        </span>
      ),
    },
    {
      title: 'Item Type',
      key: 'item',
      width: 170,
      render: (_, record) => (
        <div>
          <div className="font-bold text-indigo-500 text-xs">{record.item_type?.name || 'Item'}</div>
          <div className="text-[11px] text-slate-400 font-mono">{record.item_type?.code}</div>
        </div>
      ),
    },
    {
      title: 'Movement Type',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: StockMovement['type']) => getTypeTag(type),
    },
    {
      title: 'Qty & Balance Impact',
      key: 'quantity',
      width: 150,
      render: (_, record) => (
        <div className="font-mono text-xs">
          <div className="font-bold text-slate-100">
            {record.type === 'OUT' ? '-' : '+'}{record.quantity.toLocaleString()} {record.item_type?.unit || 'pcs'}
          </div>
          <div className="text-[11px] text-slate-400">
            Balance: {record.previous_quantity} ➔ {record.new_quantity}
          </div>
        </div>
      ),
    },
    {
      title: 'User & Movement Audit Trail',
      key: 'user_notes',
      width: 260,
      render: (_, record) => {
        const parsed = parseTransferNotes(record.notes);
        return (
          <div className="flex flex-col gap-1 text-xs">
            <div className="text-[11px] text-slate-300 flex items-center gap-1 font-semibold">
              <UserOutlined className="text-indigo-400" />
              <span>{record.user?.username || 'Admin'}</span>
            </div>
            <div className="text-slate-200">{parsed.text || record.notes || 'Stock Entry'}</div>
            {parsed.lot && (
              <div>
                <Tag color="gold" className="font-mono text-[10px] border-none px-1.5 py-0">
                  {parsed.lot}
                </Tag>
              </div>
            )}
            {parsed.remarks && (
              <span className="text-[11px] text-slate-400 italic">
                Note: {parsed.remarks}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            <HistoryOutlined className="text-indigo-400 text-lg" />
            <span className="font-bold text-slate-100">
              Stock Movement Ledger Audit Trail {projectName ? `(${projectName})` : ''}
            </span>
          </div>
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchMovements} loading={loading} />
        </div>
      }
      width={980}
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
          scroll={{ x: 920 }}
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
