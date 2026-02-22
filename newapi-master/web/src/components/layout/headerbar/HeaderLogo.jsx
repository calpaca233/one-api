

import React from 'react';
import { Link } from 'react-router-dom';
import { Typography, Tag } from '@douyinfe/semi-ui';
import SkeletonWrapper from '../components/SkeletonWrapper';

const HeaderLogo = ({
  isMobile,
  isConsoleRoute,
  logo,
  logoLoaded,
  isLoading,
  systemName,
  isSelfUseMode,
  isDemoSiteMode,
  t,
}) => {
  if (isMobile && isConsoleRoute) {
    return null;
  }
  const normalizedName = (systemName || '').toLowerCase();
  const isLegacyBrandName =
    normalizedName.includes('new api') ||
    normalizedName.includes('new-api') ||
    normalizedName.includes('one api') ||
    normalizedName.includes('one-api') ||
    (systemName || '').includes('龙猫');
  const displaySystemName =
    !systemName || isLegacyBrandName ? t('魔芯开放平台') : systemName;

  return (
    <Link to='/' className='brand-logo-link group flex items-center gap-3'>
      <div className='brand-logo-box relative h-8 w-[116px] md:h-9 md:w-[130px]'>
        <SkeletonWrapper loading={isLoading || !logoLoaded} type='image' />
        <img
          src={logo}
          alt='KOKONI3D logo'
          className={`absolute inset-0 h-full w-full object-contain transition-all duration-200 group-hover:scale-[1.02] ${!isLoading && logoLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      <div className='hidden md:flex items-center gap-2 min-w-0'>
        <div className='flex flex-col min-w-0'>
          <SkeletonWrapper
            loading={isLoading}
            type='title'
            width={168}
            height={24}
          >
            <Typography.Title
              heading={4}
              className='!text-base !font-semibold !mb-0 !leading-tight truncate'
            >
              {displaySystemName}
            </Typography.Title>
          </SkeletonWrapper>
          <Typography.Text className='!text-xs !text-semi-color-text-2 truncate'>
            {t('魔芯科技（Magicore Technology）')}
          </Typography.Text>
          {(isSelfUseMode || isDemoSiteMode) && !isLoading && (
            <div className='mt-1'>
              <Tag
                color={isSelfUseMode ? 'indigo' : 'blue'}
                className='text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap'
                size='small'
                shape='circle'
              >
                {isSelfUseMode ? t('自用模式') : t('演示站点')}
              </Tag>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default HeaderLogo;
