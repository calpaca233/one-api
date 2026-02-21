/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Select, message, Statistic, Row, Col, Tooltip } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import { API as api } from '../helpers/api';

const { Option } = Select;
const { TextArea } = Input;

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    status: '',
  });
  const [stats, setStats] = useState({
    pending: 0,
    issued: 0,
    rejected: 0,
    total: 0,
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusForm] = Form.useForm();

  // 获取发票列表
  const fetchInvoices = async (page = 1, pageSize = 10, status = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
      });
      if (status !== '') {
        params.append('status', status);
      }

      const response = await api.get(`/api/invoice/admin?${params.toString()}`);
      if (response.data.success) {
        setInvoices(response.data.data.invoices);
        setPagination({
          current: response.data.data.page,
          pageSize: response.data.data.size,
          total: response.data.data.total,
        });
      }
    } catch (error) {
      message.error('获取发票列表失败');
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await api.get('/api/invoice/admin/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, []);

  // 处理状态筛选
  const handleStatusFilter = (status) => {
    setFilters({ ...filters, status });
    fetchInvoices(1, pagination.pageSize, status);
  };

  // 处理分页变化
  const handleTableChange = (pagination) => {
    fetchInvoices(pagination.current, pagination.pageSize, filters.status);
  };

  // 查看发票详情
  const handleViewDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setDetailModalVisible(true);
  };

  // 更新发票状态
  const handleUpdateStatus = (invoice) => {
    setSelectedInvoice(invoice);
    statusForm.setFieldsValue({
      status: invoice.status,
      remark: invoice.remark || '',
    });
    setStatusModalVisible(true);
  };

  // 提交状态更新
  const handleStatusSubmit = async () => {
    try {
      const values = await statusForm.validateFields();
      const response = await api.put(`/api/invoice/admin/${selectedInvoice.id}/status`, values);
      if (response.data.success) {
        message.success('发票状态更新成功');
        setStatusModalVisible(false);
        fetchInvoices(pagination.current, pagination.pageSize, filters.status);
        fetchStats();
      }
    } catch (error) {
      message.error('更新发票状态失败');
      console.error('Error updating status:', error);
    }
  };

  // 获取状态标签
  const getStatusTag = (status) => {
    const statusMap = {
      0: { color: 'processing', text: '待处理', icon: <ClockCircleOutlined /> },
      1: { color: 'success', text: '已开票', icon: <CheckCircleOutlined /> },
      2: { color: 'error', text: '已拒绝', icon: <CloseCircleOutlined /> },
    };
    const statusInfo = statusMap[status] || { color: 'default', text: '未知', icon: null };
    return (
      <Tag color={statusInfo.color} icon={statusInfo.icon}>
        {statusInfo.text}
      </Tag>
    );
  };

  // 格式化金额
  const formatAmount = (amount) => {
    return `¥${amount.toFixed(2)}`;
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user) => (
        <div>
          <div>{user.username}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{user.display_name}</div>
        </div>
      ),
    },
    {
      title: '发票抬头',
      dataIndex: 'title',
      key: 'title',
      width: 150,
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount) => formatAmount(amount),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 150,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '申请时间',
      dataIndex: 'created_time',
      key: 'created_time',
      width: 150,
      render: (time) => formatTime(time),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {record.status === 0 && (
            <Tooltip title="更新状态">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleUpdateStatus(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="发票管理" style={{ marginBottom: 16 }}>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic
              title="待处理"
              value={stats.pending}
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已开票"
              value={stats.issued}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已拒绝"
              value={stats.rejected}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总计"
              value={stats.total}
              prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
            />
          </Col>
        </Row>

        {/* 筛选器 */}
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>状态筛选：</span>
            <Select
              value={filters.status}
              onChange={handleStatusFilter}
              style={{ width: 120 }}
              placeholder="全部状态"
            >
              <Option value="">全部状态</Option>
              <Option value="0">待处理</Option>
              <Option value="1">已开票</Option>
              <Option value="2">已拒绝</Option>
            </Select>
          </Space>
        </div>

        {/* 发票列表 */}
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 发票详情模态框 */}
      <Modal
        title="发票详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {selectedInvoice && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <strong>发票ID：</strong>{selectedInvoice.id}
              </Col>
              <Col span={12}>
                <strong>状态：</strong>{getStatusTag(selectedInvoice.status)}
              </Col>
              <Col span={12}>
                <strong>用户：</strong>{selectedInvoice.user.username} ({selectedInvoice.user.display_name})
              </Col>
              <Col span={12}>
                <strong>金额：</strong>{formatAmount(selectedInvoice.amount)}
              </Col>
              <Col span={24}>
                <strong>发票抬头：</strong>{selectedInvoice.title}
              </Col>
              <Col span={12}>
                <strong>税号：</strong>{selectedInvoice.tax_number || '无'}
              </Col>
              <Col span={12}>
                <strong>接收邮箱：</strong>{selectedInvoice.email}
              </Col>
              <Col span={24}>
                <strong>发票内容：</strong>{selectedInvoice.content || '无'}
              </Col>
              <Col span={12}>
                <strong>申请时间：</strong>{formatTime(selectedInvoice.created_time)}
              </Col>
              <Col span={12}>
                <strong>更新时间：</strong>{formatTime(selectedInvoice.updated_time)}
              </Col>
              {selectedInvoice.remark && (
                <Col span={24}>
                  <strong>备注：</strong>{selectedInvoice.remark}
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>

      {/* 更新状态模态框 */}
      <Modal
        title="更新发票状态"
        open={statusModalVisible}
        onOk={handleStatusSubmit}
        onCancel={() => setStatusModalVisible(false)}
        width={500}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value={0}>待处理</Option>
              <Option value={1}>已开票</Option>
              <Option value={2}>已拒绝</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea
              rows={4}
              placeholder="请输入备注信息（可选）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceManagement;
