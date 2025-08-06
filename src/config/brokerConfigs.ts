// src/config/brokerConfigs.ts
import { BrokerConfig, BrokerType } from '../types/broker';

export const BROKER_CONFIGS: Record<BrokerType, BrokerConfig> = {
  alpaca: {
    name: 'Alpaca',
    type: 'alpaca',
    icon: '🦙',
    description: 'Commission-free stock and crypto trading with robust API',
    authType: 'api_keys',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'text',
        required: true,
        placeholder: 'PKTEST_xxxxxxxxxxxxxxxxxx',
        description: 'Your Alpaca API Key from the dashboard'
      },
      {
        key: 'apiSecret',
        label: 'API Secret',
        type: 'password',
        required: true,
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Alpaca API Secret (keep this secure)'
      },
      {
        key: 'baseUrl',
        label: 'Environment',
        type: 'select',
        required: true,
        options: [
          { value: 'https://paper-api.alpaca.markets', label: 'Paper Trading' },
          { value: 'https://api.alpaca.markets', label: 'Live Trading' }
        ],
        description: 'Choose paper trading for testing or live for real trades'
      }
    ],
    testConnection: true,
    paperTradingSupport: true,
    supportedMarkets: ['stocks', 'crypto'],
    websiteUrl: 'https://alpaca.markets',
    apiDocsUrl: 'https://alpaca.markets/docs'
  },

  interactive_brokers: {
    name: 'Interactive Brokers',
    type: 'interactive_brokers',
    icon: '🏛️',
    description: 'Professional trading platform with global market access',
    authType: 'credentials',
    fields: [
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'text',
        required: true,
        placeholder: '123456789',
        description: 'Your IB client/account ID'
      },
      {
        key: 'host',
        label: 'TWS/Gateway Host',
        type: 'text',
        required: false,
        placeholder: '127.0.0.1',
        description: 'TWS/Gateway host address (default: localhost)'
      },
      {
        key: 'port',
        label: 'TWS/Gateway Port',
        type: 'number',
        required: false,
        placeholder: '7497',
        description: 'TWS port: 7497 (live) or 7496 (paper)'
      }
    ],
    testConnection: true,
    paperTradingSupport: true,
    supportedMarkets: ['stocks', 'options', 'futures', 'forex', 'crypto'],
    websiteUrl: 'https://interactivebrokers.com',
    apiDocsUrl: 'https://interactivebrokers.github.io'
  },

  binance: {
    name: 'Binance',
    type: 'binance',
    icon: '🪙',
    description: 'World\'s largest cryptocurrency exchange',
    authType: 'api_keys',
    fields: [
      {
        key: 'binanceApiKey',
        label: 'API Key',
        type: 'text',
        required: true,
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Binance API Key'
      },
      {
        key: 'binanceSecretKey',
        label: 'Secret Key',
        type: 'password',
        required: true,
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Binance Secret Key'
      },
      {
        key: 'baseUrl',
        label: 'Environment',
        type: 'select',
        required: true,
        options: [
          { value: 'https://testnet.binance.vision', label: 'Testnet' },
          { value: 'https://api.binance.com', label: 'Mainnet' }
        ]
      }
    ],
    testConnection: true,
    paperTradingSupport: true,
    supportedMarkets: ['crypto'],
    websiteUrl: 'https://binance.com',
    apiDocsUrl: 'https://binance-docs.github.io/apidocs'
  },

  td_ameritrade: {
    name: 'TD Ameritrade',
    type: 'td_ameritrade',
    icon: '🏦',
    description: 'Full-service broker with comprehensive trading tools',
    authType: 'oauth',
    fields: [
      {
        key: 'clientSecret',
        label: 'Client ID',
        type: 'text',
        required: true,
        placeholder: 'XXXXXXXXXX@AMER.OAUTHAP',
        description: 'Your TD Ameritrade OAuth Client ID'
      },
      {
        key: 'redirectUri',
        label: 'Redirect URI',
        type: 'url',
        required: true,
        placeholder: 'https://localhost:3000/auth/callback',
        description: 'OAuth redirect URI (must match registered URI)'
      }
    ],
    testConnection: true,
    paperTradingSupport: false,
    supportedMarkets: ['stocks', 'options', 'etfs'],
    websiteUrl: 'https://tdameritrade.com',
    apiDocsUrl: 'https://developer.tdameritrade.com'
  },

  schwab: {
    name: 'Charles Schwab',
    type: 'schwab',
    icon: '🏛️',
    description: 'Full-service broker (successor to TD Ameritrade)',
    authType: 'oauth',
    fields: [
      {
        key: 'clientSecret',
        label: 'App Key',
        type: 'text',
        required: true,
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Schwab OAuth App Key'
      },
      {
        key: 'redirectUri',
        label: 'Redirect URI',
        type: 'url',
        required: true,
        placeholder: 'https://localhost:3000/auth/callback',
        description: 'OAuth redirect URI'
      }
    ],
    testConnection: true,
    paperTradingSupport: false,
    supportedMarkets: ['stocks', 'options', 'etfs'],
    websiteUrl: 'https://schwab.com',
    apiDocsUrl: 'https://developer.schwab.com'
  },

  mt4: {
    name: 'MetaTrader 4',
    type: 'mt4',
    icon: '📈',
    description: 'Popular forex and CFD trading platform',
    authType: 'credentials',
    fields: [
      {
        key: 'serverUrl',
        label: 'MT4 Bridge URL',
        type: 'url',
        required: true,
        placeholder: 'http://localhost:8080',
        description: 'MT4 API bridge server URL'
      },
      {
        key: 'login',
        label: 'Account Login',
        type: 'text',
        required: true,
        placeholder: '12345678',
        description: 'Your MT4 account login number'
      },
      {
        key: 'password',
        label: 'Account Password',
        type: 'password',
        required: true,
        description: 'Your MT4 account password'
      },
      {
        key: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'MetaQuotes-Demo',
        description: 'MT4 server name'
      }
    ],
    testConnection: true,
    paperTradingSupport: true,
    supportedMarkets: ['forex', 'cfd', 'crypto'],
    websiteUrl: 'https://metatrader4.com',
    apiDocsUrl: 'https://docs.mql4.com'
  },

  mt5: {
    name: 'MetaTrader 5',
    type: 'mt5',
    icon: '📊',
    description: 'Advanced multi-asset trading platform',
    authType: 'credentials',
    fields: [
      {
        key: 'serverUrl',
        label: 'MT5 Bridge URL',
        type: 'url',
        required: true,
        placeholder: 'http://localhost:8080',
        description: 'MT5 API bridge server URL'
      },
      {
        key: 'login',
        label: 'Account Login',
        type: 'text',
        required: true,
        placeholder: '12345678',
        description: 'Your MT5 account login number'
      },
      {
        key: 'password',
        label: 'Account Password',
        type: 'password',
        required: true,
        description: 'Your MT5 account password'
      },
      {
        key: 'serverName',
        label: 'Server Name',
        type: 'text',
        required: true,
        placeholder: 'MetaQuotes-Demo',
        description: 'MT5 server name'
      }
    ],
    testConnection: true,
    paperTradingSupport: true,
    supportedMarkets: ['stocks', 'forex', 'futures', 'cfd', 'crypto'],
    websiteUrl: 'https://metatrader5.com',
    apiDocsUrl: 'https://docs.mql5.com'
  },

  webull: {
    name: 'Webull',
    type: 'webull',
    icon: '📱',
    description: 'Commission-free mobile trading platform',
    authType: 'oauth',
    fields: [
      {
        key: 'clientSecret',
        label: 'App ID',
        type: 'text',
        required: true,
        placeholder: 'xxxxxxxxxxxxxxxxx',
        description: 'Your Webull App ID'
      },
      {
        key: 'redirectUri',
        label: 'Redirect URI',
        type: 'url',
        required: true,
        placeholder: 'https://localhost:3000/auth/callback',
        description: 'OAuth redirect URI'
      }
    ],
    testConnection: false,
    paperTradingSupport: true,
    supportedMarkets: ['stocks', 'options', 'crypto'],
    websiteUrl: 'https://webull.com',
    apiDocsUrl: 'https://developers.webull.com'
  },

  robinhood: {
    name: 'Robinhood',
    type: 'robinhood',
    icon: '🏹',
    description: 'Commission-free trading for everyone',
    authType: 'oauth',
    fields: [
      {
        key: 'clientSecret',
        label: 'Client ID',
        type: 'text',
        required: true,
        placeholder: 'xxxxxxxxxxxxxxxxx',
        description: 'Your Robinhood OAuth Client ID'
      },
      {
        key: 'redirectUri',
        label: 'Redirect URI',
        type: 'url',
        required: true,
        placeholder: 'https://localhost:3000/auth/callback',
        description: 'OAuth redirect URI'
      }
    ],
    testConnection: false,
    paperTradingSupport: false,
    supportedMarkets: ['stocks', 'options', 'crypto'],
    websiteUrl: 'https://robinhood.com',
    apiDocsUrl: 'https://robinhood.com/api'
  }
};

export const POPULAR_BROKERS: BrokerType[] = [
  'alpaca',
  'interactive_brokers',
  'td_ameritrade',
  'schwab',
  'binance'
];

export const getBrokerConfig = (brokerType: BrokerType): BrokerConfig => {
  return BROKER_CONFIGS[brokerType];
};

export const getAllBrokerConfigs = (): BrokerConfig[] => {
  return Object.values(BROKER_CONFIGS);
};