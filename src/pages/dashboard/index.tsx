import React from 'react';
import { Card, Row, Col, Tag, Avatar } from 'antd';
import {
  UserOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/layout/Navbar';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const roleName = (typeof user?.role === 'object' ? user.role.name : (user?.role || 'user')).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      <div className="background-decor">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>

      <Navbar />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Welcome Card */}
        <Card className="shadow-2xl border border-white/10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar
              size={64}
              style={{ backgroundColor: '#6366f1' }}
              icon={<UserOutlined />}
              className="font-bold text-2xl"
            >
              {user?.username.charAt(0).toUpperCase()}
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-slate-100 font-['Outfit'] mb-1">
                Welcome back, {user?.username}!
              </h1>
              <p className="text-sm text-slate-400 mb-0">
                Authenticated session active in Ravi Inventory System with role{' '}
                <Tag color="purple" className="font-bold border-none ml-1">
                  {roleName}
                </Tag>
              </p>
            </div>
          </div>
        </Card>

        {/* System Status Grid */}
        <Row gutter={[20, 20]}>
          <Col xs={24} md={8}>
            <Card className="shadow-lg hover:border-indigo-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <DatabaseOutlined className="text-2xl text-cyan-400" />
                <Tag icon={<CheckCircleFilled />} color="success" className="mr-0 font-semibold">
                  CONNECTED
                </Tag>
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">
                PostgreSQL & Sequelize
              </h3>
              <p className="text-xs text-slate-400 mb-0">
                Connected to database <code>Inventory_Management</code>
              </p>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card className="shadow-lg hover:border-indigo-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <ApiOutlined className="text-2xl text-emerald-400" />
                <Tag icon={<CheckCircleFilled />} color="success" className="mr-0 font-semibold">
                  ONLINE
                </Tag>
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">Backend REST API</h3>
              <p className="text-xs text-slate-400 mb-0">
                Node.js server active on <code>http://localhost:5000</code>
              </p>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card className="shadow-lg hover:border-indigo-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <ClockCircleOutlined className="text-2xl text-indigo-400" />
                <Tag color="processing" className="mr-0 font-semibold">
                  ACTIVE
                </Tag>
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">JWT Security Session</h3>
              <p className="text-xs text-slate-400 mb-0">
                Token signed with 7-day expiration
              </p>
            </Card>
          </Col>
        </Row>
      </main>
    </div>
  );
};
export default DashboardPage;
