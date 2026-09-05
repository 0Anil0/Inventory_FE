import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, message } from 'antd';
import {
  SafetyCertificateFilled,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  ThunderboltFilled,
  LoginOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { encryptPasswordPayload } from '../../utils/crypto.utils';

export const LoginPage: React.FC = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [isSignUpMode, setIsSignUpMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleQuickAdmin = () => {
    form.setFieldsValue({
      username: 'admin',
      password: 'admin123',
    });
    setIsSignUpMode(false);
  };

  const handleFinish = async (values: any) => {
    setLoading(true);
    const encryptedPassword = encryptPasswordPayload(values.password);

    try {
      if (isSignUpMode) {
        const result = await signup({
          username: values.username,
          email: values.email,
          password: encryptedPassword,
        });
        if (result.success) {
          message.success('Account created successfully!');
          navigate('/dashboard');
        } else {
          message.error(result.message || 'Registration failed');
        }
      } else {
        const result = await login({
          username: values.username,
          password: encryptedPassword,
        });
        if (result.success) {
          message.success('Welcome back!');
          navigate('/dashboard');
        } else {
          message.error(result.message || 'Invalid username or password');
        }
      }
    } catch (err: any) {
      message.error(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-page-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className="background-decor">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/10 backdrop-blur-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 py-1 px-4 rounded-full text-xs font-bold tracking-widest mb-3">
              <SafetyCertificateFilled />
              INVENTORY MANAGEMENT SYSTEM
            </div>
            <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-1">
              {isSignUpMode ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-xs app-text-muted">
              {isSignUpMode
                ? 'Register to access the inventory system'
                : 'Enter your credentials to manage inventory'}
            </p>
          </div>

          {/* Quick Admin Fill Helper */}
          <Button
            type="dashed"
            block
            icon={<ThunderboltFilled className="text-amber-400" />}
            onClick={handleQuickAdmin}
            className="mb-6 border-indigo-500/40 text-indigo-300 hover:text-white hover:border-indigo-400 bg-indigo-500/10"
          >
            Quick Admin Login (admin / admin123)
          </Button>

          {/* Auth Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please input your username' }]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="Username"
              />
            </Form.Item>

            {isSignUpMode && (
              <Form.Item
                name="email"
                rules={[{ type: 'email', message: 'Please input a valid email' }]}
              >
                <Input
                  prefix={<MailOutlined className="text-gray-400" />}
                  placeholder="Email Address (Optional)"
                />
              </Form.Item>
            )}

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              icon={isSignUpMode ? <UserAddOutlined /> : <LoginOutlined />}
              className="mt-2 h-11 text-base font-semibold shadow-lg shadow-indigo-500/30"
            >
              {isSignUpMode ? 'Create Account' : 'Sign In'}
            </Button>
          </Form>

          {/* Mode Switch Footer */}
          <div className="text-center mt-6 text-xs text-slate-400">
            <span>
              {isSignUpMode ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <Button
              type="link"
              className="p-0 text-indigo-400 font-bold text-xs"
              onClick={() => {
                setIsSignUpMode(!isSignUpMode);
                form.resetFields();
              }}
            >
              {isSignUpMode ? 'Sign In' : 'Register now'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default LoginPage;
