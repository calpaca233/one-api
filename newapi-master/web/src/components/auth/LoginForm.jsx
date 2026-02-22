

import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../../context/User';
import {
  API,
  getLogo,
  showError,
  showInfo,
  showSuccess,
  updateAPI,
  getSystemName,
  setUserData,
  onGitHubOAuthClicked,
  onOIDCClicked,
  onLinuxDOOAuthClicked,
} from '../../helpers';
import Turnstile from 'react-turnstile';
import { Button, Card, Divider, Form, Icon, Modal } from '@douyinfe/semi-ui';
import Title from '@douyinfe/semi-ui/lib/es/typography/title';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';
import TelegramLoginButton from 'react-telegram-login';

import { IconGithubLogo, IconMail, IconLock } from '@douyinfe/semi-icons';
import OIDCIcon from '../common/logo/OIDCIcon';
import WeChatIcon from '../common/logo/WeChatIcon';
import LinuxDoIcon from '../common/logo/LinuxDoIcon';
import TwoFAVerification from './TwoFAVerification';
import { useTranslation } from 'react-i18next';

const LoginForm = () => {
  let navigate = useNavigate();
  const { t } = useTranslation();
  const [inputs, setInputs] = useState({
    username: '',
    password: '',
    wechat_verification_code: '',
    login_verification_code: '',
  });
  const { username, password } = inputs;
  const [searchParams, setSearchParams] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [userState, userDispatch] = useContext(UserContext);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [showWeChatLoginModal, setShowWeChatLoginModal] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [linuxdoLoading, setLinuxdoLoading] = useState(false);
  const [emailLoginLoading, setEmailLoginLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginVerifyCodeLoading, setLoginVerifyCodeLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [otherLoginOptionsLoading, setOtherLoginOptionsLoading] =
    useState(false);
  const [wechatCodeSubmitLoading, setWechatCodeSubmitLoading] = useState(false);
  const [showTwoFA, setShowTwoFA] = useState(false);

  const logo = getLogo();
  const systemName = getSystemName();
  const displaySystemName = systemName || t('魔芯开放平台');

  let affCode = new URLSearchParams(window.location.search).get('aff');
  if (affCode) {
    localStorage.setItem('aff', affCode);
  }

  const [status] = useState(() => {
    const savedStatus = localStorage.getItem('status');
    return savedStatus ? JSON.parse(savedStatus) : {};
  });

  useEffect(() => {
    if (status.turnstile_check) {
      setTurnstileEnabled(true);
      setTurnstileSiteKey(status.turnstile_site_key);
    }
  }, [status]);

  useEffect(() => {
    if (searchParams.get('expired')) {
      showError(t('未登录或登录已过期，请重新登录'));
    }
  }, []);

  const onWeChatLoginClicked = () => {
    setWechatLoading(true);
    setShowWeChatLoginModal(true);
    setWechatLoading(false);
  };

  const onSubmitWeChatVerificationCode = async () => {
    if (turnstileEnabled && turnstileToken === '') {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setWechatCodeSubmitLoading(true);
    try {
      const res = await API.get(
        `/api/oauth/wechat?code=${inputs.wechat_verification_code}`,
      );
      const { success, message, data } = res.data;
      if (success) {
        userDispatch({ type: 'login', payload: data });
        localStorage.setItem('user', JSON.stringify(data));
        setUserData(data);
        updateAPI();
        navigate('/');
        showSuccess('登录成功！');
        setShowWeChatLoginModal(false);
      } else {
        showError(message);
      }
    } catch (error) {
      showError('登录失败，请重试');
    } finally {
      setWechatCodeSubmitLoading(false);
    }
  };

  function handleChange(name, value) {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  }

  async function handleSubmit(e) {
    if (turnstileEnabled && turnstileToken === '') {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setSubmitted(true);
    setLoginLoading(true);
    try {
      if (username && password) {
        if (status.email_verification && !inputs.login_verification_code) {
          showInfo('请输入邮箱验证码');
          return;
        }
        const res = await API.post(
          `/api/user/login?turnstile=${turnstileToken}`,
          {
            username,
            password,
            verification_code: inputs.login_verification_code || '',
          },
        );
        const { success, message, data } = res.data;
        if (success) {
          // 检查是否需要2FA验证
          if (data && data.require_2fa) {
            setShowTwoFA(true);
            setLoginLoading(false);
            return;
          }

          userDispatch({ type: 'login', payload: data });
          setUserData(data);
          updateAPI();
          showSuccess('登录成功！');
          if (username === 'root' && password === '123456') {
            Modal.error({
              title: '您正在使用默认密码！',
              content: '请立刻修改默认密码！',
              centered: true,
            });
          }
          navigate('/console');
        } else {
          showError(message);
        }
      } else {
        showError('请输入用户名和密码！');
      }
    } catch (error) {
      showError('登录失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  }

  // 添加Telegram登录处理函数
  const onTelegramLoginClicked = async (response) => {
    const fields = [
      'id',
      'first_name',
      'last_name',
      'username',
      'photo_url',
      'auth_date',
      'hash',
      'lang',
    ];
    const params = {};
    fields.forEach((field) => {
      if (response[field]) {
        params[field] = response[field];
      }
    });
    try {
      const res = await API.get(`/api/oauth/telegram/login`, { params });
      const { success, message, data } = res.data;
      if (success) {
        userDispatch({ type: 'login', payload: data });
        localStorage.setItem('user', JSON.stringify(data));
        showSuccess('登录成功！');
        setUserData(data);
        updateAPI();
        navigate('/');
      } else {
        showError(message);
      }
    } catch (error) {
      showError('登录失败，请重试');
    }
  };

  // 包装的GitHub登录点击处理
  const handleGitHubClick = () => {
    setGithubLoading(true);
    try {
      onGitHubOAuthClicked(status.github_client_id);
    } finally {
      // 由于重定向，这里不会执行到，但为了完整性添加
      setTimeout(() => setGithubLoading(false), 3000);
    }
  };

  // 包装的OIDC登录点击处理
  const handleOIDCClick = () => {
    setOidcLoading(true);
    try {
      onOIDCClicked(status.oidc_authorization_endpoint, status.oidc_client_id);
    } finally {
      // 由于重定向，这里不会执行到，但为了完整性添加
      setTimeout(() => setOidcLoading(false), 3000);
    }
  };

  // 包装的LinuxDO登录点击处理
  const handleLinuxDOClick = () => {
    setLinuxdoLoading(true);
    try {
      onLinuxDOOAuthClicked(status.linuxdo_client_id);
    } finally {
      // 由于重定向，这里不会执行到，但为了完整性添加
      setTimeout(() => setLinuxdoLoading(false), 3000);
    }
  };

  // 包装的邮箱登录选项点击处理
  const handleEmailLoginClick = () => {
    setEmailLoginLoading(true);
    setShowEmailLogin(true);
    setEmailLoginLoading(false);
  };

  // 包装的重置密码点击处理
  const handleResetPasswordClick = () => {
    setResetPasswordLoading(true);
    navigate('/reset');
    setResetPasswordLoading(false);
  };

  const handleSendLoginVerificationCode = async () => {
    if (!username) {
      showInfo(t('请输入您的用户名或邮箱地址'));
      return;
    }
    if (turnstileEnabled && turnstileToken === '') {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setLoginVerifyCodeLoading(true);
    try {
      const res = await API.get(
        `/api/verification/login?account=${encodeURIComponent(username)}&turnstile=${turnstileToken}`,
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('验证码已发送，请查收绑定邮箱'));
      } else {
        showError(message);
      }
    } catch (error) {
      showError('验证码发送失败，请重试');
    } finally {
      setLoginVerifyCodeLoading(false);
    }
  };

  // 包装的其他登录选项点击处理
  const handleOtherLoginOptionsClick = () => {
    setOtherLoginOptionsLoading(true);
    setShowEmailLogin(false);
    setOtherLoginOptionsLoading(false);
  };

  // 2FA验证成功处理
  const handle2FASuccess = (data) => {
    userDispatch({ type: 'login', payload: data });
    setUserData(data);
    updateAPI();
    showSuccess('登录成功！');
    navigate('/console');
  };

  // 返回登录页面
  const handleBackToLogin = () => {
    setShowTwoFA(false);
    setInputs({
      username: '',
      password: '',
      wechat_verification_code: '',
      login_verification_code: '',
    });
  };

  const renderOAuthOptions = () => {
    return (
      <div className='flex flex-col items-center'>
        <div className='w-full max-w-md'>
          <div className='flex items-center justify-center mb-6 gap-2'>
            <img src={logo} alt='Logo' className='h-10 w-auto object-contain' />
            <Title heading={3} className='!text-gray-800'>
              {displaySystemName}
            </Title>
          </div>
          <div className='text-center mb-4'>
            <Text type='tertiary'>{t('魔芯科技（Magicore Technology）')}</Text>
          </div>

          <Card className='mx-auth-card border-0 !rounded-2xl overflow-hidden'>
            <div className='flex justify-center pt-6 pb-2'>
              <Title heading={3} className='text-gray-800 dark:text-gray-200'>
                {t('登 录')}
              </Title>
            </div>
            <div className='px-2 py-8'>
              <div className='space-y-3'>
                {status.wechat_login && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={
                      <Icon svg={<WeChatIcon />} style={{ color: '#07C160' }} />
                    }
                    onClick={onWeChatLoginClicked}
                    loading={wechatLoading}
                  >
                    <span className='ml-3'>{t('使用 微信 继续')}</span>
                  </Button>
                )}

                {status.github_oauth && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={<IconGithubLogo size='large' />}
                    onClick={handleGitHubClick}
                    loading={githubLoading}
                  >
                    <span className='ml-3'>{t('使用 GitHub 继续')}</span>
                  </Button>
                )}

                {status.oidc_enabled && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={<OIDCIcon style={{ color: '#1877F2' }} />}
                    onClick={handleOIDCClick}
                    loading={oidcLoading}
                  >
                    <span className='ml-3'>{t('使用 OIDC 继续')}</span>
                  </Button>
                )}

                {status.linuxdo_oauth && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={
                      <LinuxDoIcon
                        style={{
                          color: '#E95420',
                          width: '20px',
                          height: '20px',
                        }}
                      />
                    }
                    onClick={handleLinuxDOClick}
                    loading={linuxdoLoading}
                  >
                    <span className='ml-3'>{t('使用 LinuxDO 继续')}</span>
                  </Button>
                )}

                {status.telegram_oauth && (
                  <div className='flex justify-center my-2'>
                    <TelegramLoginButton
                      dataOnauth={onTelegramLoginClicked}
                      botName={status.telegram_bot_name}
                    />
                  </div>
                )}

                <Divider margin='12px' align='center'>
                  {t('或')}
                </Divider>

                <Button
                  theme='solid'
                  type='primary'
                  className='w-full h-12 flex items-center justify-center !bg-[#003e7e] !text-white !rounded-full hover:!bg-[#2483c6] transition-colors'
                  icon={<IconMail size='large' />}
                  onClick={handleEmailLoginClick}
                  loading={emailLoginLoading}
                >
                  <span className='ml-3'>{t('使用 邮箱或用户名 登录')}</span>
                </Button>
              </div>

              {!status.self_use_mode_enabled && (
                <div className='mt-6 text-center text-sm'>
                  <Text>
                    {t('没有账户？')}{' '}
                    <Link
                      to='/register'
                      className='text-blue-600 hover:text-blue-800 font-medium'
                    >
                      {t('注册')}
                    </Link>
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderEmailLoginForm = () => {
    return (
      <div className='flex flex-col items-center'>
        <div className='w-full max-w-md'>
          <div className='flex items-center justify-center mb-6 gap-2'>
            <img src={logo} alt='Logo' className='h-10 w-auto object-contain' />
            <Title heading={3}>{displaySystemName}</Title>
          </div>
          <div className='text-center mb-4'>
            <Text type='tertiary'>{t('魔芯科技（Magicore Technology）')}</Text>
          </div>

          <Card className='mx-auth-card border-0 !rounded-2xl overflow-hidden'>
            <div className='flex justify-center pt-6 pb-2'>
              <Title heading={3} className='text-gray-800 dark:text-gray-200'>
                {t('登 录')}
              </Title>
            </div>
            <div className='px-2 py-8'>
              <Form className='space-y-3'>
                <Form.Input
                  field='username'
                  label={t('用户名或邮箱')}
                  placeholder={t('请输入您的用户名或邮箱地址')}
                  name='username'
                  onChange={(value) => handleChange('username', value)}
                  prefix={<IconMail />}
                />

                <Form.Input
                  field='password'
                  label={t('密码')}
                  placeholder={t('请输入您的密码')}
                  name='password'
                  mode='password'
                  onChange={(value) => handleChange('password', value)}
                  prefix={<IconLock />}
                />

                {status.email_verification && (
                  <Form.Input
                    field='login_verification_code'
                    label={t('邮箱验证码')}
                    placeholder={t('请输入邮箱验证码')}
                    name='login_verification_code'
                    onChange={(value) =>
                      handleChange('login_verification_code', value)
                    }
                    suffix={
                      <Button
                        theme='borderless'
                        type='tertiary'
                        onClick={handleSendLoginVerificationCode}
                        loading={loginVerifyCodeLoading}
                      >
                        {t('发送验证码')}
                      </Button>
                    }
                  />
                )}

                <div className='space-y-2 pt-2'>
                  <Button
                    theme='solid'
                    className='w-full !rounded-full'
                    type='primary'
                    htmlType='submit'
                    onClick={handleSubmit}
                    loading={loginLoading}
                  >
                    {t('继续')}
                  </Button>

                  <Button
                    theme='borderless'
                    type='tertiary'
                    className='w-full !rounded-full'
                    onClick={handleResetPasswordClick}
                    loading={resetPasswordLoading}
                  >
                    {t('忘记密码？')}
                  </Button>
                </div>
              </Form>

              {(status.github_oauth ||
                status.oidc_enabled ||
                status.wechat_login ||
                status.linuxdo_oauth ||
                status.telegram_oauth) && (
                <>
                  <Divider margin='12px' align='center'>
                    {t('或')}
                  </Divider>

                  <div className='mt-4 text-center'>
                    <Button
                      theme='outline'
                      type='tertiary'
                      className='w-full !rounded-full'
                      onClick={handleOtherLoginOptionsClick}
                      loading={otherLoginOptionsLoading}
                    >
                      {t('其他登录选项')}
                    </Button>
                  </div>
                </>
              )}

              {!status.self_use_mode_enabled && (
                <div className='mt-6 text-center text-sm'>
                  <Text>
                    {t('没有账户？')}{' '}
                    <Link
                      to='/register'
                      className='text-blue-600 hover:text-blue-800 font-medium'
                    >
                      {t('注册')}
                    </Link>
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // 微信登录模态框
  const renderWeChatLoginModal = () => {
    return (
      <Modal
        title={t('微信扫码登录')}
        visible={showWeChatLoginModal}
        maskClosable={true}
        onOk={onSubmitWeChatVerificationCode}
        onCancel={() => setShowWeChatLoginModal(false)}
        okText={t('登录')}
        centered={true}
        okButtonProps={{
          loading: wechatCodeSubmitLoading,
        }}
      >
        <div className='flex flex-col items-center'>
          <img src={status.wechat_qrcode} alt='微信二维码' className='mb-4' />
        </div>

        <div className='text-center mb-4'>
          <p>
            {t('微信扫码关注公众号，输入「验证码」获取验证码（三分钟内有效）')}
          </p>
        </div>

        <Form>
          <Form.Input
            field='wechat_verification_code'
            placeholder={t('验证码')}
            label={t('验证码')}
            value={inputs.wechat_verification_code}
            onChange={(value) =>
              handleChange('wechat_verification_code', value)
            }
          />
        </Form>
      </Modal>
    );
  };

  // 2FA验证弹窗
  const render2FAModal = () => {
    return (
      <Modal
        title={
          <div className='flex items-center'>
            <div className='w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-3'>
              <svg
                className='w-4 h-4 text-green-600 dark:text-green-400'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M6 8a2 2 0 11-4 0 2 2 0 014 0zM8 7a1 1 0 100 2h8a1 1 0 100-2H8zM6 14a2 2 0 11-4 0 2 2 0 014 0zM8 13a1 1 0 100 2h8a1 1 0 100-2H8z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            两步验证
          </div>
        }
        visible={showTwoFA}
        onCancel={handleBackToLogin}
        footer={null}
        width={450}
        centered
      >
        <TwoFAVerification
          onSuccess={handle2FASuccess}
          onBack={handleBackToLogin}
          isModal={true}
        />
      </Modal>
    );
  };

  return (
    <div className='mx-auth-page relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      {/* 背景模糊晕染球 */}
      <div
        className='blur-ball blur-ball-indigo'
        style={{ top: '-80px', right: '-80px', transform: 'none' }}
      />
      <div
        className='blur-ball blur-ball-teal'
        style={{ top: '50%', left: '-120px' }}
      />
      <div className='w-full max-w-md mt-[60px]'>
        {showEmailLogin ||
        !(
          status.github_oauth ||
          status.oidc_enabled ||
          status.wechat_login ||
          status.linuxdo_oauth ||
          status.telegram_oauth
        )
          ? renderEmailLoginForm()
          : renderOAuthOptions()}
        {renderWeChatLoginModal()}
        {render2FAModal()}

        {turnstileEnabled && (
          <div className='flex justify-center mt-6'>
            <Turnstile
              sitekey={turnstileSiteKey}
              onVerify={(token) => {
                setTurnstileToken(token);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;
