

import { useMemo } from 'react';

export const useNavigation = (t, docsLink, headerNavModules) => {
  const mainNavLinks = useMemo(() => {
    // 默认配置，如果没有传入配置则显示所有模块
    const defaultModules = {
      home: true,
      console: true,
      tapnow: true,
      pricing: true,
      docs: true,
      about: true,
    };

    // 使用传入的配置或默认配置
    const modules = headerNavModules || defaultModules;

    const allLinks = [
      {
        text: t('首页'),
        itemKey: 'home',
        to: '/',
      },
      {
        text: t('控制台'),
        itemKey: 'console',
        to: '/console',
      },
      {
        text: t('创作工作台'),
        itemKey: 'tapnow',
        to: '/console/tapnow',
      },
      {
        text: t('模型广场'),
        itemKey: 'pricing',
        to: '/pricing',
      },
    //   ...(docsLink
    //     ? [
    //         {
    //           text: t('文档'),
    //           itemKey: 'docs',
    //           isExternal: true,
    //           externalLink: docsLink,
    //         },
    //       ]
    //     : []),
      {
        text: t('文档'),
        itemKey: 'about',
        to: '/about',
      },
    ];

    // 根据配置过滤导航链接
    return allLinks.filter((link) => {
      if (link.itemKey === 'docs') {
        return docsLink && modules.docs;
      }
      if (link.itemKey === 'pricing') {
        // 支持新的pricing配置格式
        return typeof modules.pricing === 'object'
          ? modules.pricing.enabled
          : modules.pricing;
      }
      if (link.itemKey === 'tapnow') {
        return modules.tapnow !== false;
      }
      return modules[link.itemKey] === true;
    });
  }, [t, docsLink, headerNavModules]);

  return {
    mainNavLinks,
  };
};
