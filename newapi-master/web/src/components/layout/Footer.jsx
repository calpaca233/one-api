

import React, { useEffect, useState, useMemo, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from '@douyinfe/semi-ui';
import { getFooterHTML, getLogo, getSystemName } from '../../helpers';
import { StatusContext } from '../../context/Status';

const FooterBar = () => {
  const { t } = useTranslation();
  const [footer, setFooter] = useState(getFooterHTML());
  const [statusState] = useContext(StatusContext);
  const logo = getLogo();
  const systemNameRaw = getSystemName() || '';
  const normalizedName = systemNameRaw.toLowerCase();
  const systemName =
    !systemNameRaw ||
    normalizedName.includes('new api') ||
    normalizedName.includes('new-api') ||
    normalizedName.includes('one api') ||
    normalizedName.includes('one-api') ||
    systemNameRaw.includes('龙猫')
      ? t('魔芯开放平台')
      : systemNameRaw;
  const [icpNumber, setIcpNumber] = useState(
    localStorage.getItem('icp_number') || '',
  );
  const currentYear = new Date().getFullYear();

  const loadFooter = () => {
    const footerHtml = localStorage.getItem('footer_html');
    if (footerHtml) {
      setFooter(footerHtml);
    }
  };

  const customFooter = useMemo(
    () => (
      <footer className='mx-brand-footer px-6 md:px-10 py-12'>
        <div className='mx-auto w-full max-w-[1200px]'>
          <div className='grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]'>
            <div>
              <img
                src={logo}
                alt='KOKONI3D'
                className='h-10 w-auto object-contain mb-4'
              />
              <Typography.Title heading={5} className='!mb-2'>
                {systemName}
              </Typography.Title>
              <Typography.Text className='!text-semi-color-text-1'>
                {t(
                  '由魔芯科技（Magicore Technology）打造的开放能力平台，提供稳定、高可用、可扩展的模型接入体验。',
                )}
              </Typography.Text>
            </div>

            <div>
              <Typography.Text strong>{t('公司')}</Typography.Text>
              <div className='mt-3 flex flex-col gap-2'>
                <a
                  href='https://www.kokoni3d.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mx-footer-link'
                >
                  {t('官网')}
                </a>
                <a
                  href='https://www.kokoni3d.com/pages/app'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mx-footer-link'
                >
                  {t('品牌介绍')}
                </a>
                <a
                  href='https://www.kokoni3d.com/pages/app'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mx-footer-link'
                >
                  {t('开放平台')}
                </a>
              </div>
            </div>

            <div>
              <Typography.Text strong>{t('产品')}</Typography.Text>
              <div className='mt-3 flex flex-col gap-2'>
                <a
                  href='https://www.kokoni3d.com/pages/app'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mx-footer-link'
                >
                  KOKONI 3D APP
                </a>
                <a
                  href='https://www.kokoni3d.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mx-footer-link'
                >
                  KOKONI 3D Printer
                </a>
              </div>
            </div>

            <div>
              <Typography.Text strong>{t('支持')}</Typography.Text>
              <div className='mt-3 flex flex-col gap-2'>
                <a
                  href='https://www.kokoni3d.com/pages/app'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mx-footer-link'
                >
                  {t('联系我们')}
                </a>
                <a
                  href='https://www.kokoni3d.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mx-footer-link'
                >
                  {t('帮助中心')}
                </a>
                <a
                  href='https://www.kokoni3d.com/policies/privacy-policy'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mx-footer-link'
                >
                  {t('隐私政策')}
                </a>
              </div>
            </div>
          </div>

          <div className='mt-10 border-t border-semi-color-border pt-6 flex flex-col items-center gap-2 text-sm text-semi-color-text-2'>
            <span>
              © {currentYear} {t('魔芯科技（Magicore Technology）')} ·{' '}
              {t('保留所有权利')}
            </span>
            {icpNumber && (
              <a
                href='https://beian.miit.gov.cn/'
                target='_blank'
                rel='noopener noreferrer'
                className='mx-footer-link'
              >
                {icpNumber}
              </a>
            )}
          </div>
        </div>
      </footer>
    ),
    [currentYear, icpNumber, logo, systemName, t],
  );

  useEffect(() => {
    loadFooter();
  }, []);

  useEffect(() => {
    const icp =
      statusState?.status?.icp_number || localStorage.getItem('icp_number') || '';
    setIcpNumber(icp);
  }, [statusState]);

  return (
    <div className='w-full'>
      {footer ? (
        <>
          <div
            className='custom-footer'
            dangerouslySetInnerHTML={{ __html: footer }}
          ></div>
          {icpNumber && (
            <div className='flex justify-center py-4'>
              <a
                href='https://beian.miit.gov.cn/'
                target='_blank'
                rel='noopener noreferrer'
                className='mx-footer-link'
              >
                {icpNumber}
              </a>
            </div>
          )}
        </>
      ) : (
        customFooter
      )}
    </div>
  );
};

export default FooterBar;
