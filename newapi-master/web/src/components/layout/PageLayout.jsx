

import HeaderBar from './headerbar';
import { Layout } from '@douyinfe/semi-ui';
import SiderBar from './SiderBar';
import App from '../../App';
import FooterBar from './Footer';
import { ToastContainer } from 'react-toastify';
import React, { useContext, useEffect, useState } from 'react';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { useSidebarCollapsed } from '../../hooks/common/useSidebarCollapsed';
import { useTranslation } from 'react-i18next';
import {
  API,
  getLogo,
  getSystemName,
  showError,
  setStatusData,
} from '../../helpers';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import { useLocation } from 'react-router-dom';
const { Sider, Content, Header } = Layout;

const PageLayout = () => {
  const [, userDispatch] = useContext(UserContext);
  const [statusState, statusDispatch] = useContext(StatusContext);
  const isMobile = useIsMobile();
  const [collapsed, , setCollapsed] = useSidebarCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { i18n } = useTranslation();
  const location = useLocation();

  const shouldHideFooter =
    location.pathname.startsWith('/console') ||
    location.pathname === '/pricing';

  const shouldInnerPadding =
    location.pathname.includes('/console') &&
    !location.pathname.startsWith('/console/chat') &&
    location.pathname !== '/console/playground';

  const isConsoleRoute = location.pathname.startsWith('/console');
  const showSider = isConsoleRoute && (!isMobile || drawerOpen);

  useEffect(() => {
    if (isMobile && drawerOpen && collapsed) {
      setCollapsed(false);
    }
  }, [isMobile, drawerOpen, collapsed, setCollapsed]);

  const loadUser = async () => {
    let user = localStorage.getItem('user');
    if (user) {
      let data = JSON.parse(user);
      userDispatch({ type: 'login', payload: data });

      // 从服务器获取最新的用户数据以确保配额等信息是最新的
      try {
        const res = await API.get('/api/user/self');
        const { success, message, data: serverData } = res.data;
        if (success) {
          // 更新用户状态为服务器返回的最新数据
          userDispatch({ type: 'login', payload: serverData });
          // 同时更新localStorage
          localStorage.setItem('user', JSON.stringify(serverData));
        } else {
          console.warn('Failed to fetch latest user data:', message);
        }
      } catch (error) {
        console.warn('Failed to fetch latest user data:', error);
        // 如果获取失败，继续使用localStorage中的数据
      }
    }
  };

  const loadStatus = async () => {
    try {
      const res = await API.get('/api/status');
      const { success, data } = res.data;
      if (success) {
        statusDispatch({ type: 'set', payload: data });
        setStatusData(data);
      } else {
        showError('Unable to connect to server');
      }
    } catch (error) {
      showError('Failed to load status');
    }
  };

  useEffect(() => {
    loadUser().catch(console.error);
    loadStatus().catch(console.error);
    let systemName = getSystemName();
    if (systemName) {
      document.title = systemName;
    }
    let logo = getLogo();
    if (logo) {
      let linkElement = document.querySelector("link[rel~='icon']");
      if (linkElement) {
        linkElement.href = logo;
      }
    }
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  // 当状态更新后，更新页面标题
  useEffect(() => {
    if (statusState?.status?.system_name) {
      document.title = statusState.status.system_name;
    } else {
      let systemName = getSystemName();
      if (systemName) {
        document.title = systemName;
      }
    }
  }, [statusState]);

  return (
    <Layout
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: isMobile ? 'visible' : 'hidden',
      }}
    >
      {
        !isMobile ? (
          <>
            <Header
                style={{
                padding: 0,
                height: 'auto',
                lineHeight: 'normal',
                position: 'fixed',
                width: '100%',
                top: 0,
                zIndex: 100,
                }}
            >
                <HeaderBar
                    onMobileMenuToggle={() => setDrawerOpen((prev) => !prev)}
                    drawerOpen={drawerOpen}
                />
            </Header>
            <Layout
                style={{
                overflow: isMobile ? 'visible' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                }}
            >
                {showSider && (
                <Sider
                    style={{
                    position: 'fixed',
                    left: 0,
                    top: '64px',
                    zIndex: 99,
                    border: 'none',
                    paddingRight: '0',
                    height: 'calc(100vh - 64px)',
                    width: 'var(--sidebar-current-width)',
                    }}
                >
                    <SiderBar
                    onNavigate={() => {
                        if (isMobile) setDrawerOpen(false);
                    }}
                    />
                </Sider>
                )}
                <Layout
                style={{
                    marginLeft: isMobile
                    ? '0'
                    : showSider
                        ? 'var(--sidebar-current-width)'
                        : '0',
                    flex: '1 1 auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                >
                <Content
                    style={{
                    flex: '1 0 auto',
                    overflowY: isMobile ? 'visible' : 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    padding: shouldInnerPadding ? (isMobile ? '5px' : '24px') : '0',
                    position: 'relative',
                    }}
                >
                    <App />
                </Content>
                {!shouldHideFooter && (
                    <Layout.Footer
                    style={{
                        flex: '0 0 auto',
                        width: '100%',
                    }}
                    >
                    <FooterBar />
                    </Layout.Footer>
                )}
                </Layout>
            </Layout>
            <ToastContainer />
          </>
        )
        : (
          <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            textAlign: 'center',
            background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px 20px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              width: '90%',
              maxWidth: '400px'
            }}>
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: '60px',
                  height: '60px',
                  margin: '0 auto 20px',
                  color: '#5c7cfa'
                }}
              >
                <path
                  fill="currentColor"
                  d="M20,18c1.1,0,2-0.9,2-2V6c0-1.1-0.9-2-2-2H4C2.9,4,2,4.9,2,6v10c0,1.1,0.9,2,2,2H0v2h24v-2H20z M4,6h16v10H4V6z"
                />
              </svg>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '16px',
                color: '#333'
              }}>请使用电脑访问</h1>
              <p style={{
                fontSize: '16px',
                lineHeight: '1.5',
                color: '#666',
                marginBottom: '0'
              }}>当前页面需要在更大的屏幕上查看，请使用电脑或平板电脑横屏模式访问以获得最佳体验。</p>
            </div>
          </div>
        )
      }
    </Layout>
  );
};

export default PageLayout;
