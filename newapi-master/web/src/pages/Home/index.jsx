

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, ScrollItem, ScrollList } from '@douyinfe/semi-ui';
import { API, copy, showError, showSuccess } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { IconCopy, IconFile, IconPlay } from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();
  const docsLink = statusState?.status?.docs_link || 'https://www.kokoni3d.com';
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
  const endpointItems = API_ENDPOINTS.map((e) => ({ value: e }));
  const [endpointIndex, setEndpointIndex] = useState(0);
  const isChinese = i18n.language.startsWith('zh');

  const heroContent = useMemo(
    () => ({
      badge: 'KOKONI3D',
      title: isChinese ? '魔芯开放平台' : 'Mochip Open Platform',
      subtitle: isChinese
        ? '企业级模型开放接口服务'
        : 'Enterprise AI API Gateway',
      description: isChinese
        ? '统一接入 · 稳定可靠 · 面向全球开发者'
        : 'Unified Access · Reliable Infrastructure · Built for Global Developers',
      features: isChinese
        ? ['高可用网关', '灵活扩展能力', '企业级安全']
        : ['Highly Available Gateway', 'Flexible Extensibility', 'Enterprise Security'],
    }),
    [isChinese],
  );

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent(t('加载首页内容失败...'));
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      showSuccess(t('已复制到剪切板'));
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % endpointItems.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [endpointItems.length]);

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='mx-home-hero w-full overflow-x-hidden'>
          <div className='mx-home-hero-inner'>
            <div className='mx-home-badge'>{heroContent.badge}</div>
            <h1 className='mx-home-title'>{heroContent.title}</h1>
            <p className='mx-home-subtitle'>{heroContent.subtitle}</p>
            <p className='mx-home-description'>{heroContent.description}</p>

            <div className='mx-home-endpoint mt-6 md:mt-8'>
              <Input
                readonly
                value={serverAddress}
                className='mx-home-input'
                size={isMobile ? 'default' : 'large'}
                suffix={
                  <div className='flex items-center gap-2'>
                    <ScrollList
                      bodyHeight={32}
                      style={{ border: 'unset', boxShadow: 'unset' }}
                    >
                      <ScrollItem
                        mode='wheel'
                        cycled={true}
                        list={endpointItems}
                        selectedIndex={endpointIndex}
                        onSelect={({ index }) => setEndpointIndex(index)}
                      />
                    </ScrollList>
                    <Button
                      type='primary'
                      onClick={handleCopyBaseURL}
                      icon={<IconCopy />}
                      className='!rounded-full'
                    />
                  </div>
                }
              />
            </div>

            <div className='mx-home-actions'>
              <Link to='/console'>
                <Button
                  theme='solid'
                  type='primary'
                  size={isMobile ? 'default' : 'large'}
                  className='mx-brand-primary-btn'
                  icon={<IconPlay />}
                >
                  {t('进入控制台')}
                </Button>
              </Link>
              <Button
                size={isMobile ? 'default' : 'large'}
                className='mx-brand-outline-btn'
                icon={<IconFile />}
                onClick={() => window.open(docsLink, '_blank')}
              >
                {t('文档')}
              </Button>
            </div>

            <div className='mx-home-feature-grid'>
              {heroContent.features.map((feature) => (
                <Card key={feature} className='mx-home-feature-card' shadows='hover'>
                  {feature}
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              className='w-full h-screen border-none'
            />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
