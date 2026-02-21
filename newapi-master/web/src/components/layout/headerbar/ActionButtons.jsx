

import React from 'react';
import NewYearButton from './NewYearButton';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import UserArea from './UserArea';

const ActionButtons = ({
  isNewYear,
  unreadCount,
  onNoticeOpen,
  theme,
  onThemeToggle,
  currentLang,
  onLanguageChange,
  userState,
  isLoading,
  isMobile,
  isSelfUseMode,
  logout,
  navigate,
  t,
}) => {
  return (
    <div className='flex items-center gap-2 md:gap-3'>
      <NewYearButton isNewYear={isNewYear} />

      <ThemeToggle theme={theme} onThemeToggle={onThemeToggle} t={t} />

      <LanguageSelector
        currentLang={currentLang}
        onLanguageChange={onLanguageChange}
        t={t}
      />

      <UserArea
        userState={userState}
        isLoading={isLoading}
        isMobile={isMobile}
        isSelfUseMode={isSelfUseMode}
        logout={logout}
        navigate={navigate}
        t={t}
      />
    </div>
  );
};

export default ActionButtons;
