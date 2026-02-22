import React from 'react';
import { useTranslation } from 'react-i18next';

const TapnowPage = () => {
  const { t } = useTranslation();

  return (
    <div className='w-full h-full min-h-[calc(100vh-64px)] bg-semi-color-bg-0'>
      <iframe
        title={t('Tapnow 创作工作台')}
        src='/api/tapnow/app'
        className='w-full h-full min-h-[calc(100vh-64px)] border-0'
        allow='clipboard-read; clipboard-write; fullscreen'
      />
    </div>
  );
};

export default TapnowPage;
