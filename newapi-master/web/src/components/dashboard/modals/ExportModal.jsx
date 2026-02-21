import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Toast, Select } from '@douyinfe/semi-ui';
import { API as api } from '../../../helpers/api';

const ExportModal = ({
  exportModalVisible,
  handleCloseExportModal,
  isAdminUser,
  t,
}) => {
  const [exportLoading, setExportLoading] = useState(false);
  const [formData, setFormData] = useState({
    startTime: null,
    endTime: null,
    format: 'excel',
    username: ''
  });
  
  // 用户选择相关状态
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userPage, setUserPage] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 获取用户列表（仅管理员）
  const fetchUsers = async (page = 0, keyword = '', append = false) => {
    if (!isAdminUser) return;
    
    setLoadingUsers(true);
    try {
      const pageSize = 50;
      let url;
      
      if (keyword) {
        url = `/api/user/search?keyword=${encodeURIComponent(keyword)}&p=${page}&size=${pageSize}`;
      } else {
        url = `/api/user/?p=${page}&size=${pageSize}`;
      }
      
      const response = await api.get(url);
      if (response.data.success) {
        const responseData = response.data.data;
        const newUsers = responseData?.items || [];
        
        if (append) {
          setUsers(prevUsers => [...prevUsers, ...newUsers]);
        } else {
          setUsers(newUsers);
        }
        
        setHasMoreUsers(newUsers.length === pageSize);
      }
    } catch (error) {
      console.error('获取用户列表失败：', error);
      Toast.error('获取用户列表失败');
    } finally {
      setLoadingUsers(false);
    }
  };

  // 初始加载用户列表
  useEffect(() => {
    if (exportModalVisible && isAdminUser) {
      setUserPage(0);
      setHasMoreUsers(true);
      setSearchKeyword('');
      fetchUsers(0, '', false);
    }
  }, [exportModalVisible, isAdminUser]);

  // 加载更多用户
  const loadMoreUsers = () => {
    if (!loadingUsers && hasMoreUsers) {
      const nextPage = userPage + 1;
      setUserPage(nextPage);
      fetchUsers(nextPage, searchKeyword, true);
    }
  };

  // 搜索用户
  const handleUserSearch = (keyword) => {
    setSearchKeyword(keyword);
    setUserPage(0);
    setHasMoreUsers(true);
    fetchUsers(0, keyword, false);
  };

  // 设置默认时间范围（最近 30 天）
  useEffect(() => {
    if (exportModalVisible) {
      const endTime = new Date();
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - 30);

      setFormData(prev => ({
        ...prev,
        startTime: startTime,
        endTime: endTime
      }));
    }
  }, [exportModalVisible]);


  // 导出账单
  const handleExport = async () => {
    if (!formData.startTime || !formData.endTime) {
      Toast.error('请选择时间范围');
      return;
    }

    setExportLoading(true);
    try {
      const params = {
        start_time: Math.floor(formData.startTime.getTime() / 1000),
        end_time: Math.floor(formData.endTime.getTime() / 1000),
        format: formData.format,
        username: formData.username || ''
      };

      console.log('Export params:', params); // 调试日志

      const response = await api.post('/api/billing/export/', params, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 从响应头获取文件名，如果没有则使用默认名称
      let filename = '数据看板导出.xlsx';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        // 优先解析 filename*=UTF-8''... 格式（RFC 5987）
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;\n]*)/i);
        if (filenameStarMatch && filenameStarMatch[1]) {
          try {
            filename = decodeURIComponent(filenameStarMatch[1]);
          } catch (e) {
            console.error('Failed to decode filename*:', e);
          }
        } else {
          // 如果没有 filename*，尝试解析 filename=
          const filenameMatch = contentDisposition.match(/filename[^*][^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
            try {
              filename = decodeURIComponent(filename);
            } catch (e) {
              // 如果解码失败，使用原始文件名
            }
          }
        }
      }
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      Toast.success('数据导出成功');
    } catch (error) {
      Toast.error('导出失败，请重试');
      console.error('Error exporting billing:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleFormChange = (value, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Modal
      title={t('数据导出')}
      visible={exportModalVisible}
      onCancel={handleCloseExportModal}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleCloseExportModal}>
            {t('取消')}
          </Button>
          <Button
            onClick={handleExport}
            loading={exportLoading}
            theme="solid"
            type="primary"
            disabled={!formData.startTime || !formData.endTime}
          >
            {t('导出数据')}
          </Button>
        </div>
      }
      size="large"
      centered
    >
      <Form layout="vertical" className="w-full">
        <Row gutter={16}>
          <Col span={12}>
            <Form.DatePicker
              field="startTime"
              label={t('开始时间')}
              value={formData.startTime}
              type="dateTime"
              onChange={(value) => handleFormChange(value, 'startTime')}
              className="w-full"
            />
          </Col>
          <Col span={12}>
            <Form.DatePicker
              field="endTime"
              label={t('结束时间')}
              value={formData.endTime}
              type="dateTime"
              onChange={(value) => handleFormChange(value, 'endTime')}
              className="w-full"
            />
          </Col>
        </Row>

        {isAdminUser && (
          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col span={24}>
              <Form.Select
                field="username"
                label={t('筛选用户（可选）')}
                value={formData.username}
                placeholder={t('全部用户')}
                onChange={(value) => handleFormChange(value, 'username')}
                className="w-full"
                loading={loadingUsers}
                filter
                showClear
                remote
                onSearch={handleUserSearch}
                onDropdownVisibleChange={(visible) => {
                  if (visible && users.length === 0 && !loadingUsers) {
                    fetchUsers(0, '', false);
                  }
                }}
                dropdownStyle={{ maxHeight: 400 }}
                style={{ width: '100%' }}
              >
                {users.map((u) => (
                  <Select.Option key={u.username} value={u.username}>
                    {u.username} {u.display_name ? `(${u.display_name})` : ''}
                  </Select.Option>
                ))}
                {hasMoreUsers && (
                  <Select.Option 
                    key="load-more" 
                    value="__load_more__" 
                    disabled
                    style={{ textAlign: 'center', color: '#999' }}
                  >
                    <div onClick={(e) => {
                      e.stopPropagation();
                      loadMoreUsers();
                    }} style={{ cursor: 'pointer', padding: '8px 0' }}>
                      {loadingUsers ? t('加载中...') : t('点击加载更多')}
                    </div>
                  </Select.Option>
                )}
              </Form.Select>
            </Col>
          </Row>
        )}

      </Form>
    </Modal>
  );
};

export default ExportModal;
