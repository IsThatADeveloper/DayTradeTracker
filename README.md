# 📈 DayTradeTracker (Update?)


> A comprehensive day trading journal and analytics platform built with React, TypeScript, and Firebase

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://day-trade-tracker.vercel.app/)
[![GitHub](https://img.shields.io/badge/github-repo-blue)](https://github.com/IsThatADeveloper/DayTradeTracker)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

DayTradeTracker is a modern web application designed to help day traders log, analyze, and improve their trading performance. With real-time analytics, AI-powered insights, and broker integrations, it provides everything you need to track your trading journey.

![DayTradeTracker Dashboard](docs/screenshot-dashboard.png)

## ✨ Features

### 📊 Core Functionality
- **Manual Trade Entry** - Quick and intuitive trade logging with real-time P&L calculation
- **Bulk CSV Import** - Import multiple trades at once from spreadsheets
- **Daily Dashboard** - Real-time performance metrics and statistics
- **Calendar View** - Visual monthly overview of trading performance
- **Trade Table** - Comprehensive list with inline editing and filtering

### 📈 Advanced Analytics
- **AI-Powered Insights** - Intelligent analysis of trading patterns and behaviors
- **Time Analysis** - Identify your most profitable trading hours
- **Equity Curve** - Visualize your account growth over time
- **Daily Review** - Performance report cards with letter grades
- **Earnings Projections** - Calculate potential earnings and dividend forecasts

### 🔗 Integrations
- **Broker Connections** - Auto-sync trades from popular brokers:
  - Alpaca
  - Interactive Brokers
  - Binance
  - TD Ameritrade
  - E*TRADE
  - Robinhood (via CSV)
- **Stock Analysis** - Real-time stock search and analysis
- **Market News** - Integrated news feed for market research

### 🎨 User Experience
- **Dark Mode** - Eye-friendly interface for extended use
- **Responsive Design** - Seamless experience across desktop, tablet, and mobile
- **Interactive Tutorial** - Guided walkthrough for new users
- **Cloud Sync** - Secure Firebase authentication and data storage
- **Export Functionality** - Download your trades as CSV for backup or analysis

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase account (for authentication and cloud storage)
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/IsThatADeveloper/DayTradeTracker.git
   cd DayTradeTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

### Production Build

```bash
npm run build
npm run preview  # Preview the production build locally
```

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool and dev server
- **Lucide React** - Beautiful icon library

### Backend & Services
- **Firebase Authentication** - Secure user management
- **Cloud Firestore** - Real-time database
- **Firebase Security Rules** - Data protection and access control

### Key Libraries
- **Recharts** - Interactive chart visualizations
- **date-fns** - Date manipulation and formatting
- **React Router** - (If using routing)

## 📁 Project Structure

```
DayTradeTracker/
├── src/
│   ├── components/          # React components
│   │   ├── AIInsights.tsx
│   │   ├── AuthComponent.tsx
│   │   ├── BulkTradeImport.tsx
│   │   ├── Calendar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DailyReview.tsx
│   │   ├── EarningsProjection.tsx
│   │   ├── EquityCurve.tsx
│   │   ├── HomePage.tsx
│   │   ├── ManualTradeEntry.tsx
│   │   ├── Profile.tsx
│   │   ├── StockNews.tsx
│   │   ├── StockSearch.tsx
│   │   ├── TimeAnalysis.tsx
│   │   ├── TradeTable.tsx
│   │   └── Tutorial.tsx
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useBrokerIntegration.ts
│   │   ├── useLocalStorage.ts
│   │   └── useTutorial.ts
│   ├── services/            # API and external services
│   │   └── tradeService.ts
│   ├── types/               # TypeScript type definitions
│   │   └── trade.ts
│   ├── utils/               # Utility functions
│   │   ├── securityUtils.ts
│   │   └── tradeUtils.ts
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── .env                     # Environment variables (create this)
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎯 Key Components

### ManualTradeEntry
Quick trade logging form with automatic P&L calculation and real-time validation.

### BulkTradeImport
CSV import functionality with date validation and duplicate detection.

### Dashboard
Real-time statistics including total P&L, win rate, average win/loss, and trade count.

### Calendar
Monthly calendar view showing daily performance with color-coded profit/loss indicators.

### AIInsights
AI-powered analysis identifying trading patterns, optimal times, and improvement areas.

### EarningsProjection
Calculate potential future earnings based on historical performance and configurable parameters.

## 🔐 Security

- **HTTPS Enforcement** - All connections must use secure HTTPS
- **Firebase Security Rules** - User data isolation and protection
- **Content Security Policy** - XSS and injection attack prevention
- **Input Validation** - Client and server-side validation
- **Rate Limiting** - Protection against abuse (on Firebase backend)

## 📱 Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and TypeScript conventions
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly before submitting
- Update documentation for new features

## 🐛 Known Issues & Roadmap

### Current Issues
- CSV import date parsing edge cases with timezone handling
- Mobile menu animation performance on slower devices

### Planned Features
- [ ] Advanced filtering and search in trade table
- [ ] Custom report generation with PDF export
- [ ] Trading strategy backtesting
- [ ] Multi-account support
- [ ] Social features (anonymous performance comparison)
- [ ] Webhooks for broker integrations
- [ ] Mobile app (React Native)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Eshaan**

- GitHub: [@IsThatADeveloper](https://github.com/IsThatADeveloper)
- Project Link: [https://github.com/IsThatADeveloper/DayTradeTracker](https://github.com/IsThatADeveloper/DayTradeTracker)
- Live Demo: [https://day-trade-tracker.vercel.app/](https://day-trade-tracker.vercel.app/)

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Charts by [Recharts](https://recharts.org/)
- Styling by [Tailwind CSS](https://tailwindcss.com/)
- Hosting by [Vercel](https://vercel.com/)
- Backend by [Firebase](https://firebase.google.com/)

## 📊 Performance

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices)
- **Bundle Size**: < 500KB gzipped
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s

## 🔧 Troubleshooting

### Common Issues

**Problem**: Firebase authentication not working  
**Solution**: Ensure your `.env` file is properly configured and your domain is authorized in Firebase Console.

**Problem**: CSV import fails  
**Solution**: Check that your CSV follows the expected format (Time, Ticker, Direction, Quantity, Entry Price, Exit Price, Realized P&L, Notes).

**Problem**: Dark mode not persisting  
**Solution**: Check browser localStorage permissions and ensure cookies are enabled.

**Problem**: Application error on load  
**Solution**: Clear browser cache, ensure you're using HTTPS, and check the browser console for detailed error messages.

For more issues, please check the [GitHub Issues](https://github.com/IsThatADeveloper/DayTradeTracker/issues) page.

---

<div align="center">

**Built with ❤️ for traders, by a trader**

[Live Demo](https://day-trade-tracker.vercel.app/) · [Report Bug](https://github.com/IsThatADeveloper/DayTradeTracker/issues) · [Request Feature](https://github.com/IsThatADeveloper/DayTradeTracker/issues)

</div>
