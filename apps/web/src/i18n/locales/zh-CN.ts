import type { Resource } from 'i18next';

const zhCN: Resource = {
  common: {
    appName: 'LoopzToken',
    comingSoon: '功能建设中',
    themeLight: '浅色',
    themeDark: '深色',
    themeSystem: '跟随系统',
  },
  nav: {
    home: '首页',
    console: '控制台',
    admin: '运营后台',
    overview: '概览',
    apiKeys: 'API Key',
    usage: '用量明细',
    wallet: '余额与充值',
  },
  home: {
    heroTitle: '一个 Key，调用所有模型',
    heroSubtitle:
      'LoopzToken 将多个已授权模型 API 渠道整合为统一入口，预充值人民币余额，按实际用量扣费。',
    ctaConsole: '进入控制台',
    ctaModels: '查看模型与价格',
  },
  console: {
    overviewTitle: '概览',
    keysTitle: 'API Key',
    usageTitle: '用量明细',
    walletTitle: '余额与充值',
  },
  admin: {
    title: '运营后台',
  },
};

export default zhCN;
