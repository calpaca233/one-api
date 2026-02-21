

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, Dropdown, Typography, Tag, Modal } from '@douyinfe/semi-ui';
import { ChevronDown, Wallet, MessageCircle } from 'lucide-react';
import {
  IconExit,
  IconUserSetting,
  IconCreditCard,
  IconKey,
} from '@douyinfe/semi-icons';
import { stringToColor, renderQuota } from '../../../helpers';
import SkeletonWrapper from '../components/SkeletonWrapper';

const UserArea = ({
  userState,
  isLoading,
  isMobile,
  isSelfUseMode,
  logout,
  navigate,
  t,
}) => {
  const [contactModalVisible, setContactModalVisible] = useState(false);
  if (isLoading) {
    return (
      <SkeletonWrapper
        loading={true}
        type='userArea'
        width={50}
        isMobile={isMobile}
      />
    );
  }

  if (userState.user) {
    return (
      <div className='flex items-center gap-2'>
        {/* 联系我们按钮 */}
        <Button
          theme='borderless'
          type='tertiary'
          size='small'
          onClick={() => setContactModalVisible(true)}
          className='!px-2 !py-1 !rounded-full hover:!bg-green-50 dark:hover:!bg-green-900/20 !bg-transparent'
          icon={<MessageCircle size={14} className='text-green-600 dark:text-green-400' />}
        >
          <span className='hidden sm:inline !text-xs !font-medium !text-green-700 dark:!text-green-300'>
            {t('联系我们')}
          </span>
        </Button>

        {/* 余额显示 - 独立于下拉菜单 */}
        <Tag
          color='blue'
          size='small'
          className='!px-2 !py-1 !rounded-full !bg-blue-50 dark:!bg-blue-900/20 !border-blue-200 dark:!border-blue-700'
        >
          <div className='flex items-center gap-1'>
            <Wallet size={12} className='text-blue-600 dark:text-blue-400' />
            <Typography.Text
              className='!text-xs !font-medium !text-blue-700 dark:!text-blue-300'
              strong
            >
              {renderQuota(userState.user.quota)}
            </Typography.Text>
          </div>
        </Tag>

        {/* 用户下拉菜单 */}
        <Dropdown
          position='bottomRight'
          render={
            <Dropdown.Menu className='!bg-semi-color-bg-overlay !border-semi-color-border !shadow-lg !rounded-lg dark:!bg-gray-700 dark:!border-gray-600'>
              {/* <Dropdown.Item
                onClick={() => {
                  navigate('/console/personal');
                }}
                className='!px-3 !py-1.5 !text-sm !text-semi-color-text-0 hover:!bg-semi-color-fill-1 dark:!text-gray-200 dark:hover:!bg-blue-500 dark:hover:!text-white'
              >
                <div className='flex items-center gap-2'>
                  <IconUserSetting
                    size='small'
                    className='text-gray-500 dark:text-gray-400'
                  />
                  <span>{t('个人设置')}</span>
                </div>
              </Dropdown.Item> */}
              <Dropdown.Item
                onClick={() => {
                  navigate('/console/token');
                }}
                className='!px-3 !py-1.5 !text-sm !text-semi-color-text-0 hover:!bg-semi-color-fill-1 dark:!text-gray-200 dark:hover:!bg-blue-500 dark:hover:!text-white'
              >
                <div className='flex items-center gap-2'>
                  <IconKey
                    size='small'
                    className='text-gray-500 dark:text-gray-400'
                  />
                  <span>{t('令牌管理')}</span>
                </div>
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => {
                  navigate('/console/topup');
                }}
                className='!px-3 !py-1.5 !text-sm !text-semi-color-text-0 hover:!bg-semi-color-fill-1 dark:!text-gray-200 dark:hover:!bg-blue-500 dark:hover:!text-white'
              >
                <div className='flex items-center gap-2'>
                  <IconCreditCard
                    size='small'
                    className='text-gray-500 dark:text-gray-400'
                  />
                  <span>{t('钱包管理')}</span>
                </div>
              </Dropdown.Item>
              <Dropdown.Item
                onClick={logout}
                className='!px-3 !py-1.5 !text-sm !text-semi-color-text-0 hover:!bg-semi-color-fill-1 dark:!text-gray-200 dark:hover:!bg-red-500 dark:hover:!text-white'
              >
                <div className='flex items-center gap-2'>
                  <IconExit
                    size='small'
                    className='text-gray-500 dark:text-gray-400'
                  />
                  <span>{t('退出')}</span>
                </div>
              </Dropdown.Item>
            </Dropdown.Menu>
          }
        >
          <Button
            theme='borderless'
            type='tertiary'
            className='flex items-center gap-1.5 !p-1 !rounded-full hover:!bg-semi-color-fill-1 dark:hover:!bg-gray-700 !bg-semi-color-fill-0 dark:!bg-semi-color-fill-1 dark:hover:!bg-semi-color-fill-2'
          >
            <Avatar
              size='extra-small'
              color={stringToColor(userState.user.username)}
              className='mr-1'
            >
              {userState.user.username[0].toUpperCase()}
            </Avatar>
            <span className='hidden md:inline'>
              <Typography.Text className='!text-xs !font-medium !text-semi-color-text-1 dark:!text-gray-300 mr-1'>
                {userState.user.username}
              </Typography.Text>
            </span>
            <ChevronDown
              size={14}
              className='text-xs text-semi-color-text-2 dark:text-gray-400'
            />
          </Button>
        </Dropdown>

        {/* 联系我们模态框 */}
        <Modal
          title={t('联系我们')}
          visible={contactModalVisible}
          onCancel={() => setContactModalVisible(false)}
          footer={null}
          width={400}
          centered
        >
          <div className='text-center'>
            <img
              src='/WechatIMG80.jpeg'
              alt={t('联系我们')}
              className='w-full h-auto rounded-lg shadow-sm'
              style={{ maxHeight: '500px', objectFit: 'contain' }}
            />
            <Typography.Text className='text-sm text-gray-600 dark:text-gray-400 mt-3 block'>
              {t('扫码添加微信，获取更多帮助')}
            </Typography.Text>
          </div>
        </Modal>
      </div>
    );
  } else {
    const showRegisterButton = !isSelfUseMode;

    const commonSizingAndLayoutClass =
      'flex items-center justify-center !py-[10px] !px-1.5';

    const loginButtonSpecificStyling =
      '!bg-semi-color-fill-0 dark:!bg-semi-color-fill-1 hover:!bg-semi-color-fill-1 dark:hover:!bg-gray-700 transition-colors';
    let loginButtonClasses = `${commonSizingAndLayoutClass} ${loginButtonSpecificStyling}`;

    let registerButtonClasses = `${commonSizingAndLayoutClass}`;

    const loginButtonTextSpanClass =
      '!text-xs !text-semi-color-text-1 dark:!text-gray-300 !p-1.5';
    const registerButtonTextSpanClass = '!text-xs !text-white !p-1.5';

    if (showRegisterButton) {
      if (isMobile) {
        loginButtonClasses += ' !rounded-full';
      } else {
        loginButtonClasses += ' !rounded-l-full !rounded-r-none';
      }
      registerButtonClasses += ' !rounded-r-full !rounded-l-none';
    } else {
      loginButtonClasses += ' !rounded-full';
    }

    return (
      <div className='flex items-center'>
        <Link to='/login' className='flex'>
          <Button
            theme='borderless'
            type='tertiary'
            className={loginButtonClasses}
          >
            <span className={loginButtonTextSpanClass}>{t('登录')}</span>
          </Button>
        </Link>
        {showRegisterButton && (
          <div className='hidden md:block'>
            <Link to='/register' className='flex -ml-px'>
              <Button
                theme='solid'
                type='primary'
                className={registerButtonClasses}
              >
                <span className={registerButtonTextSpanClass}>{t('注册')}</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }
};

export default UserArea;
