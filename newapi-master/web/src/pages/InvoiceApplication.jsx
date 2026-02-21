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
import { Card, Table, Button, Tag, Space, Modal, Form, Input, message, Row, Col, Statistic, Tooltip } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { API as api } from '../helpers/api';

const { TextArea } = Input;

const InvoiceApplication = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [applicationForm] = Form.useForm();

  // 获取用户的发票申请列表
  const fetchInvoices = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
      });

      const response = await api.get(`/api/invoice/?${params.toString()}`);
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

  // 提交发票申请
  const handleApplicationSubmit = async () => {
    try {
      const values = await applicationForm.validateFields();
      // 映射字段名：前端使用驼峰命名，后端使用下划线命名
      const requestData = {
        ...values,
        tax_number: values.taxNumber,
      };
      delete requestData.taxNumber;
      
      const response = await api.post('/api/invoice/', requestData);
      if (response.data.success) {
        message.success('发票申请提交成功，请等待处理');
        setApplicationModalVisible(false);
        applicationForm.resetFields();
        fetchInvoices();
      } else {
        message.error(response.data.message || '提交失败');
      }
    } catch (error) {
      message.error('提交失败，请重试');
      console.error('Error submitting invoice:', error);
    }
  };

  // 查看发票详情
  const handleViewDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setDetailModalVisible(true);
  };

  // 处理分页变化
  const handleTableChange = (pagination) => {
    fetchInvoices(pagination.current, pagination.pageSize);
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchInvoices();
  }, []);

  // 表格列配置
  const columns = [
    {
      title: '申请时间',
      dataIndex: 'created_time',
      key: 'created_time',
      // 格式化时间
      render: (time) => new Date(time * 1000).toLocaleString(),
    },
    {
      title: '发票金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '发票抬头',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          0: { text: '待处理', color: 'orange' },
          1: { text: '已通过', color: 'green' },
          2: { text: '已拒绝', color: 'red' },
        };
        const statusInfo = statusMap[status] || { text: '未知', color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '36px' }}>
      <Card title="发票申请管理" extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setApplicationModalVisible(true)}
        >
          申请发票
        </Button>
      }>
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 申请发票弹窗 */}
      <Modal
        title="申请发票"
        open={applicationModalVisible}
        onOk={handleApplicationSubmit}
        onCancel={() => setApplicationModalVisible(false)}
        width={600}
      >
        <Form
          form={applicationForm}
          layout="vertical"
          initialValues={{
            amount: '',
            title: '',
            taxNumber: '',
            email: '',
            content: '',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="发票金额"
                rules={[
                  { required: true, message: '请输入发票金额' },
                  { pattern: /^\d+(\.\d{1,2})?$/, message: '请输入有效的金额' },
                ]}
              >
                <Input placeholder="请输入发票金额" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="title"
                label="发票抬头"
                rules={[{ required: true, message: '请输入发票抬头' }]}
              >
                <Input placeholder="请输入发票抬头" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="taxNumber"
                label="税号"
                rules={[{ required: true, message: '请输入税号' }]}
              >
                <Input placeholder="请输入税号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="content"
            label="发票内容"
            rules={[{ required: true, message: '请输入发票内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入发票内容"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 发票详情弹窗 */}
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
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="申请时间" value={new Date(selectedInvoice.created_time * 1000).toLocaleString()} />
              </Col>
              <Col span={12}>
                <Statistic title="发票金额" value={`¥${selectedInvoice.amount.toFixed(2)}`} />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <div><strong>发票抬头：</strong>{selectedInvoice.title}</div>
              </Col>
              <Col span={12}>
                <div><strong>税号：</strong>{selectedInvoice.tax_number || '无'}</div>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <div><strong>邮箱：</strong>{selectedInvoice.email}</div>
              </Col>
              <Col span={12}>
                <div><strong>状态：</strong>
                  {selectedInvoice.status === 0 && <Tag color="orange">待处理</Tag>}
                  {selectedInvoice.status === 1 && <Tag color="green">已通过</Tag>}
                  {selectedInvoice.status === 2 && <Tag color="red">已拒绝</Tag>}
                </div>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <div><strong>发票内容：</strong></div>
              <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                {selectedInvoice.content}
              </div>
            </div>
            {selectedInvoice.remark && (
              <div style={{ marginTop: 16 }}>
                <div><strong>备注：</strong></div>
                <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                  {selectedInvoice.remark}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InvoiceApplication;
