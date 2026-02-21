

import React, { useRef, useState, useEffect } from 'react';
import { Modal, Form, Select, Toast } from '@douyinfe/semi-ui';
import { API } from '../../../helpers';

const SearchModal = ({
  searchModalVisible,
  handleSearchConfirm,
  handleCloseModal,
  isMobile,
  isAdminUser: _isAdminUser,
  inputs,
  dataExportDefaultTime,
  timeOptions,
  handleInputChange,
  t,
}) => {
  const formRef = useRef();
  const [startTime, setStartTime] = useState(inputs.start_timestamp);
  const [endTime, setEndTime] = useState(inputs.end_timestamp);
  const [dateError, setDateError] = useState('');
  
  // 用户选择相关状态
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userPage, setUserPage] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  const FORM_FIELD_PROPS = {
    className: 'w-full mb-2 !rounded-lg',
  };

  // 获取用户列表（仅管理员）
  const fetchUsers = async (page = 0, keyword = '', append = false) => {
    if (!_isAdminUser) return;
    
    setLoadingUsers(true);
    try {
      const pageSize = 50;
      let url;
      
      if (keyword) {
        url = `/api/user/search?keyword=${encodeURIComponent(keyword)}&p=${page}&size=${pageSize}`;
      } else {
        url = `/api/user/?p=${page}&size=${pageSize}`;
      }
      
      const response = await API.get(url);
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
    if (searchModalVisible && _isAdminUser) {
      setUserPage(0);
      setHasMoreUsers(true);
      setSearchKeyword('');
      fetchUsers(0, '', false);
    }
  }, [searchModalVisible, _isAdminUser]);

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

  // 验证日期范围：管理员不超过 365 天，普通用户不超过 30 天
  const validateDateRange = (start, end) => {
    if (!start || !end) return true;

    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const maxDays = _isAdminUser ? 365 : 30;
    return diffDays <= maxDays;
  };

  // 处理起始时间变化
  const handleStartTimeChange = (value) => {
    setStartTime(value);
    setDateError('');

    if (value && endTime) {
      if (!validateDateRange(value, endTime)) {
        const maxDays = _isAdminUser ? 365 : 30;
        setDateError(t(`时间范围不能超过 ${maxDays} 天`));
      }
    }

    handleInputChange(value, 'start_timestamp');
  };

  // 处理结束时间变化
  const handleEndTimeChange = (value) => {
    setEndTime(value);
    setDateError('');

    if (startTime && value) {
      if (!validateDateRange(startTime, value)) {
        const maxDays = _isAdminUser ? 365 : 30;
        setDateError(t(`时间范围不能超过 ${maxDays} 天`));
      }
    }

    handleInputChange(value, 'end_timestamp');
  };

  // 同步外部输入值
  useEffect(() => {
    setStartTime(inputs.start_timestamp);
    setEndTime(inputs.end_timestamp);
  }, [inputs.start_timestamp, inputs.end_timestamp]);

  const createFormField = (Component, props) => (
    <Component {...FORM_FIELD_PROPS} {...props} />
  );

  return (
    <Modal
      title={t('搜索条件')}
      visible={searchModalVisible}
      onOk={handleSearchConfirm}
      onCancel={handleCloseModal}
      closeOnEsc={true}
      size={isMobile ? 'full-width' : 'small'}
      centered
      okButtonProps={{ disabled: !!dateError }}
    >
      <Form ref={formRef} layout='vertical' className='w-full'>
        {createFormField(Form.DatePicker, {
          field: 'start_timestamp',
          label: t('起始时间'),
          initValue: startTime,
          value: startTime,
          type: 'dateTime',
          name: 'start_timestamp',
          onChange: handleStartTimeChange,
        })}

        {createFormField(Form.DatePicker, {
          field: 'end_timestamp',
          label: t('结束时间'),
          initValue: endTime,
          value: endTime,
          type: 'dateTime',
          name: 'end_timestamp',
          onChange: handleEndTimeChange,
        })}

        {dateError && (
          <div className='text-red-500 text-sm mt-2 mb-2'>
            {dateError}
          </div>
        )}

        {createFormField(Form.Select, {
          field: 'data_export_default_time',
          label: t('时间粒度'),
          initValue: dataExportDefaultTime,
          placeholder: t('时间粒度'),
          name: 'data_export_default_time',
          optionList: timeOptions,
          onChange: (value) =>
            handleInputChange(value, 'data_export_default_time'),
        })}

        {_isAdminUser && (
          <Form.Select
            field="username"
            label={t('筛选用户（可选）')}
            value={inputs.username}
            placeholder={t('全部用户')}
            onChange={(value) => handleInputChange(value, 'username')}
            className="w-full mb-2 !rounded-lg"
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
        )}
      </Form>
    </Modal>
  );
};

export default SearchModal;
