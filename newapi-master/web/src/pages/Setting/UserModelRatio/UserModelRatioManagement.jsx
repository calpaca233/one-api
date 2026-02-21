import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Toast,
  Popconfirm,
  Space,
  Select,
  Upload,
  Card,
  Row,
  Col,
  Divider,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconDelete,
  IconEdit,
  IconUpload,
  IconDownload,
  IconSearch,
} from '@douyinfe/semi-icons';
import { API, showError, showSuccess } from '../../../helpers';

const { Option } = Select;
const { TextArea } = Input;

const UserModelRatioManagement = ({ options, refresh }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();

  // 获取用户模型倍率列表
  const fetchData = async (page = 1, pageSize = 20, keyword = '', userId = '') => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      if (keyword) params.keyword = keyword;
      if (userId) params.user_id = userId;

      const response = await API.get('/api/user-model-ratio/', { params });
      if (response.data.success) {
        setData(response.data.data.list || []);
        setPagination({
          current: response.data.data.page,
          pageSize: pageSize,
          total: response.data.data.total,
        });
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('获取数据失败');
    }
    setLoading(false);
  };

  // 获取可用模型列表
  const fetchAvailableModels = async () => {
    try {
      const response = await API.get('/api/user-model-ratio/models');
      if (response.data.success) {
        setAvailableModels(response.data.data || []);
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAvailableModels();
  }, []);

  // 搜索
  const handleSearch = () => {
    fetchData(1, pagination.pageSize, searchKeyword, searchUserId);
  };

  // 重置搜索
  const handleReset = () => {
    setSearchKeyword('');
    setSearchUserId('');
    fetchData(1, pagination.pageSize);
  };

  // 表格分页变化
  const handleTableChange = (paginationInfo) => {
    fetchData(paginationInfo.current, paginationInfo.pageSize, searchKeyword, searchUserId);
  };

  // 打开新增/编辑模态框
  const openModal = (record = null) => {
    setEditingRecord(record);
    setModalVisible(true);
    if (record) {
      form.setFieldsValue({
        user_id: record.user_id,
        model_name: record.model_name,
        ratio: record.ratio,
        remark: record.remark,
      });
    } else {
      form.resetFields();
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  // 保存用户模型倍率
  const handleSave = async (values) => {
    try {
      const response = await API.post('/api/user-model-ratio/', values);
      if (response.data.success) {
        showSuccess('保存成功');
        closeModal();
        fetchData(pagination.current, pagination.pageSize, searchKeyword, searchUserId);
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('保存失败');
    }
  };

  // 删除用户模型倍率
  const handleDelete = async (record) => {
    try {
      const response = await API.delete(`/api/user-model-ratio/${record.user_id}/${record.model_name}`);
      if (response.data.success) {
        showSuccess('删除成功');
        fetchData(pagination.current, pagination.pageSize, searchKeyword, searchUserId);
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('删除失败');
    }
  };

  // 删除用户所有模型倍率
  const handleDeleteAllUserRatios = async (userId) => {
    try {
      const response = await API.delete(`/api/user-model-ratio/${userId}`);
      if (response.data.success) {
        showSuccess('删除成功');
        fetchData(pagination.current, pagination.pageSize, searchKeyword, searchUserId);
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('删除失败');
    }
  };

  // 批量设置用户模型倍率
  const handleBatchSave = async (values) => {
    try {
      const modelRatios = {};
      values.ratios.forEach(item => {
        if (item.model_name && item.ratio) {
          modelRatios[item.model_name] = item.ratio;
        }
      });

      if (Object.keys(modelRatios).length === 0) {
        showError('请至少设置一个模型倍率');
        return;
      }

      const response = await API.post('/api/user-model-ratio/batch', {
        user_id: values.user_id,
        model_ratios: modelRatios,
      });

      if (response.data.success) {
        showSuccess('批量设置成功');
        setBatchModalVisible(false);
        batchForm.resetFields();
        fetchData(pagination.current, pagination.pageSize, searchKeyword, searchUserId);
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('批量设置失败');
    }
  };

  // 导出数据
  const handleExport = async () => {
    try {
      const params = {};
      if (searchKeyword) params.keyword = searchKeyword;
      if (searchUserId) params.user_id = searchUserId;

      const response = await API.get('/api/user-model-ratio/export', { params });
      if (response.data.success) {
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'user_model_ratios.json';
        link.click();
        URL.revokeObjectURL(url);
        showSuccess('导出成功');
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('导出失败');
    }
  };

  // 导入数据
  const handleImport = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const response = await API.post('/api/user-model-ratio/import', { data });
        if (response.data.success) {
          showSuccess(response.data.message);
          fetchData(pagination.current, pagination.pageSize, searchKeyword, searchUserId);
        } else {
          showError(response.data.message);
        }
      } catch (error) {
        showError('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    return false; // 阻止默认上传行为
  };

  const columns = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 100,
    },
    {
      title: '用户名',
      dataIndex: 'remark',
      key: 'username',
      width: 120,
    },
    {
      title: '模型名称',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 200,
    },
    {
      title: '倍率',
      dataIndex: 'ratio',
      key: 'ratio',
      width: 100,
      render: (ratio) => ratio?.toFixed(4),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_time',
      key: 'created_time',
      width: 180,
      render: (time) => new Date(time * 1000).toLocaleString(),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_time',
      key: 'updated_time',
      width: 180,
      render: (time) => new Date(time * 1000).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            theme="borderless"
            type="primary"
            icon={<IconEdit />}
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个倍率配置吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button theme="borderless" type="danger" icon={<IconDelete />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="用户模型倍率管理" style={{ marginBottom: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Input
              placeholder="搜索关键词"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="用户ID"
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col span={12}>
            <Space>
              <Button theme="solid" icon={<IconSearch />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button theme="solid" icon={<IconPlus />} onClick={() => openModal()}>
                新增
              </Button>
              <Button theme="solid" onClick={() => setBatchModalVisible(true)}>
                批量设置
              </Button>
              <Button icon={<IconDownload />} onClick={handleExport}>
                导出
              </Button>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={handleImport}
              >
                <Button icon={<IconUpload />}>导入</Button>
              </Upload>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record) => `${record.user_id}_${record.model_name}`}
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingRecord ? '编辑用户模型倍率' : '新增用户模型倍率'}
        visible={modalVisible}
        onCancel={closeModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="user_id"
            label="用户ID"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入用户ID"
              min={1}
              disabled={!!editingRecord}
            />
          </Form.Item>

          <Form.Item
            name="model_name"
            label="模型名称"
            rules={[{ required: true, message: '请选择模型' }]}
          >
            <Select
              placeholder="请选择模型"
              showSearch
              disabled={!!editingRecord}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {availableModels.map(model => (
                <Option key={model} value={model}>
                  {model}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="ratio"
            label="倍率"
            rules={[
              { required: true, message: '请输入倍率' },
              { type: 'number', min: 0.01, message: '倍率必须大于0.01' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入倍率"
              step={0.01}
              precision={4}
            />
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button theme="solid" htmlType="submit">
                保存
              </Button>
              <Button onClick={closeModal}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量设置模态框 */}
      <Modal
        title="批量设置用户模型倍率"
        visible={batchModalVisible}
        onCancel={() => setBatchModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={batchForm}
          layout="vertical"
          onFinish={handleBatchSave}
        >
          <Form.Item
            name="user_id"
            label="用户ID"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入用户ID"
              min={1}
            />
          </Form.Item>

          <Form.List name="ratios">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 'bold' }}>模型倍率配置</span>
                  <Button theme="light" onClick={() => add()} icon={<IconPlus />}>
                    添加模型
                  </Button>
                </div>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} style={{ marginBottom: 8 }}>
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'model_name']}
                        rules={[{ required: true, message: '请选择模型' }]}
                      >
                        <Select
                          placeholder="请选择模型"
                          showSearch
                          filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                        >
                          {availableModels.map(model => (
                            <Option key={model} value={model}>
                              {model}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'ratio']}
                        rules={[
                          { required: true, message: '请输入倍率' },
                          { type: 'number', min: 0.01, message: '倍率必须大于0.01' }
                        ]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder="请输入倍率"
                          step={0.01}
                          precision={4}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Button theme="borderless" type="danger" onClick={() => remove(name)}>
                        删除
                      </Button>
                    </Col>
                  </Row>
                ))}
              </>
            )}
          </Form.List>

          <Divider />

          <Form.Item>
            <Space>
              <Button theme="solid" htmlType="submit">
                批量保存
              </Button>
              <Button onClick={() => setBatchModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserModelRatioManagement;
