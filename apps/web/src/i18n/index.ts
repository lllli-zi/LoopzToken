import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-CN';

// 首发默认简体中文；en-US 后续开放（UI_TECH_STACK 11）
void i18n.use(initReactI18next).init({
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  defaultNS: 'common',
  resources: {
    'zh-CN': zhCN,
  },
  interpolation: { escapeValue: false },
});

export { i18n };
