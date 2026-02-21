import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  InputNumber,
  Select,
  Table,
  Space,
  Modal,
  Form,
  Typography,
  Divider,
  Spin,
} from '@douyinfe/semi-ui';
import { IconPlus, IconDelete, IconEdit } from '@douyinfe/semi-icons';
import { API, showError, showSuccess } from '../../helpers';

const { Option } = Select;
const { Text } = Typography;

const UserModelRatioVisualConfig = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  // 移除 Form.useForm，Semi-UI 中不需要
  const [availableModels, setAvailableModels] = useState([]);

  const [newItem, setNewItem] = useState({
    user_id: '',
    model_name: '',
    ratio: 1.0,
    remark: ''
  });

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/user-model-ratio/');
      if (res.data.success) {
        setData(res.data.data || []);
      } else {
        showError(res.data.message || '加载数据失败');
      }
    } catch (error) {
      showError('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载可用模型列表
  const loadAvailableModels = async () => {
    try {
      const res = await API.get('/api/user-model-ratio/models');
      if (res.data.success) {
        setAvailableModels(res.data.data || []);
      } else {
        showError(res.data.message || '加载模型列表失败');
      }
    } catch (error) {
      showError('加载模型列表失败: ' + error.message);
    }
  };

  useEffect(() => {
    loadData();
    loadAvailableModels();
  }, []);

  const columns = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      width: 80,
    },
    {
      title: '模型名称',
      dataIndex: 'model_name',
      width: 150,
    },
    {
      title: '倍率',
      dataIndex: 'ratio',
      width: 100,
      render: (ratio) => (
        <Text strong style={{ color: ratio < 1 ? '#52c41a' : ratio > 1 ? '#ff4d4f' : '#1890ff' }}>
          {ratio < 1 ? `${(ratio * 10).toFixed(0)}折` : ratio > 1 ? `${ratio}倍` : '原价'}
        </Text>
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="tertiary"
            icon={<IconEdit />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="danger"
            icon={<IconDelete />}
            size="small"
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setNewItem({ user_id: '', model_name: '', ratio: 1.0, remark: '' });
    setModalVisible(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItem({ ...item });
    setModalVisible(true);
  };

  const handleDelete = async (record) => {
    try {
        const res = await API.post(`/api/user-model-ratio/delete`, {
            user_id: record.user_id,
            model_name: record.model_name,
        });
      if (res.data.success) {
        showSuccess('删除成功');
        loadData();
      } else {
        showError(res.data.message || '删除失败');
      }
    } catch (error) {
      showError('删除失败: ' + error.message);
    }
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        // 编辑模式
        const res = await API.put('/api/user-model-ratio/', newItem);
        if (res.data.success) {
          showSuccess('更新成功');
          loadData();
        } else {
          showError(res.data.message || '更新失败');
        }
      } else {
        // 新增模式
        const res = await API.post('/api/user-model-ratio/', newItem);
        if (res.data.success) {
          showSuccess('添加成功');
          loadData();
        } else {
          showError(res.data.message || '添加失败');
        }
      }
      setModalVisible(false);
    } catch (error) {
      showError('操作失败: ' + error.message);
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingItem(null);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0 }}>用户模型倍率配置</h3>
            <Text type="secondary">为不同用户设置专属的模型折扣价格</Text>
          </div>
          <Button type="primary" icon={<IconPlus />} onClick={handleAdd}>
            新增配置
          </Button>
        </div>

        <Card style={{ marginBottom: '20px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: '#0ea5e9', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: '12px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              i
            </div>
            <div>
              <Text strong style={{ color: '#0c4a6e' }}>功能说明</Text>
              <div style={{ marginTop: '4px' }}>
                <Text type="secondary" style={{ color: '#0c4a6e' }}>
                  用户模型倍率功能允许为特定用户设置专属的模型折扣。倍率小于1表示折扣，大于1表示加价。
                </Text>
              </div>
            </div>
          </div>
        </Card>

        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          loading={loading}
          rowKey="id"
        />

        <Divider />

        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
          <h4>💡 倍率说明</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><strong>0.8</strong> = 8折（20%折扣）</li>
            <li><strong>0.9</strong> = 9折（10%折扣）</li>
            <li><strong>1.0</strong> = 原价</li>
            <li><strong>1.2</strong> = 1.2倍（20%加价）</li>
          </ul>
        </div>
      </Card>

      <Modal
        title={editingItem ? '编辑用户模型倍率' : '新增用户模型倍率'}
        visible={modalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>用户ID</label>
            <InputNumber
              placeholder="请输入用户ID"
              min={1}
              style={{ width: '100%' }}
              value={newItem.user_id}
              onChange={(value) => setNewItem({ ...newItem, user_id: value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>模型名称</label>
            <Select
              placeholder="请选择模型"
              style={{ width: '100%' }}
              value={newItem.model_name}
              onChange={(value) => setNewItem({ ...newItem, model_name: value })}
            >
              {availableModels.map(model => (
                <Option key={model} value={model}>
                  {model}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>倍率</label>
            <InputNumber
              placeholder="请输入倍率"
              min={0.01}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              value={newItem.ratio}
              onChange={(value) => setNewItem({ ...newItem, ratio: value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserModelRatioVisualConfig;
