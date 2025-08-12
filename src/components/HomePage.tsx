// src/components/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Calendar, 
  Clock, 
  Target, 
  Shield, 
  Cloud, 
  Smartphone,
  CheckCircle,
  ArrowRight,
  Play,
  Star,
  Users,
  DollarSign,
  Menu,
  X,
  LogIn,
  Moon,
  Sun
} from 'lucide-react';

interface HomePageProps {
  onGetStarted: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGetStarted }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const currentUser = null; // Mock for demo

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleGetStarted = () => {
    onGetStarted();
  };

  const features = [
    {
      icon: Calendar,
      title: "Interactive Trading Calendar",
      description: "Visualize your trading performance with an intuitive calendar view. See daily P&L at a glance and track your most profitable days.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Deep dive into your trading patterns with equity curves, time-based analysis, and comprehensive performance metrics.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Target,
      title: "Performance Tracking",
      description: "Monitor win rates, average gains/losses, and identify your most successful trading strategies and timeframes.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Cloud,
      title: "Cloud Sync & Security",
      description: "Your data is safely stored in the cloud with Google authentication. Access your trades from anywhere, anytime.",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: Clock,
      title: "Real-time Insights",
      description: "Track when you're most profitable with hourly performance analysis and identify optimal trading windows.",
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: Smartphone,
      title: "Mobile Optimized",
      description: "Full mobile responsiveness ensures you can track and analyze your trades on any device, anywhere.",
      gradient: "from-teal-500 to-green-500"
    }
  ];

  const stats = [
    { number: "50,000+", label: "Trades Tracked", icon: TrendingUp },
    { number: "1,200+", label: "Active Traders", icon: Users },
    { number: "95%", label: "Uptime", icon: Shield },
    { number: "$2M+", label: "P&L Analyzed", icon: DollarSign }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Day Trader",
      content: "This app transformed how I analyze my trading. The calendar view helped me identify my most profitable patterns.",
      rating: 5
    },
    {
      name: "Sarah Johnson",
      role: "Swing Trader",
      content: "The cloud sync feature is a game-changer. I can track trades on my phone and analyze on desktop seamlessly.",
      rating: 5
    },
    {
      name: "Mike Rodriguez",
      role: "Professional Trader",
      content: "The time-based analysis revealed I was most profitable in the first hour. Increased my profits by 30%.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 transition-all duration-500">
      {/* Navigation with glassmorphism */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg sticky top-0 z-50 transition-all duration-300 border-b border-white/20 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="relative">
                <TrendingUp className="h-8 w-8 text-blue-600 mr-3 drop-shadow-sm" />
                <div className="absolute -inset-1 bg-blue-500/20 blur-sm rounded-full"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 dark:from-white dark:to-blue-300 bg-clip-text text-transparent">
                DayTradeTracker
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="relative text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-all duration-200 group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-200"></span>
              </a>
              <a href="#demo" className="relative text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-all duration-200 group">
                See Demo
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-200"></span>
              </a>
              <a href="#testimonials" className="relative text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-all duration-200 group">
                Reviews
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-200"></span>
              </a>
              
              {/* Enhanced Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              <button 
                onClick={handleGetStarted}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-xl hover:from-blue-700 hover:to-purple-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {currentUser ? 'Go to App' : 'Get Started'}
              </button>
            </div>

            {/* Mobile Right Side Controls */}
            <div className="flex items-center space-x-2 md:hidden">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Enhanced Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200/50 dark:border-gray-700/50 py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
              <div className="flex flex-col space-y-2">
                <a 
                  href="#features" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Features
                </a>
                <a 
                  href="#demo" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Demo
                </a>
                <a 
                  href="#testimonials" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Reviews
                </a>
                <button 
                  onClick={() => {
                    handleGetStarted();
                    setMobileMenuOpen(false);
                  }}
                  className="mx-4 flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {currentUser ? 'Go to App' : 'Get Started'}
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <div className="mb-8">
              <span className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 dark:from-blue-900/30 dark:to-purple-900/30 dark:text-blue-300 mb-8 transition-all duration-200 border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm">
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                Trusted by 1,200+ Active Traders
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 transition-all duration-500">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                Master Your Trading
              </span>
              <br />
              <span className="bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">Performance</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed transition-colors duration-300">
              The ultimate day trading tracker that transforms your trading data into actionable insights. 
              <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                Analyze patterns, track performance, and optimize your strategy with precision.
              </span>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
              <button 
                onClick={handleGetStarted}
                className="flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-2xl hover:from-blue-700 hover:to-purple-800 transition-all duration-200 font-semibold text-lg shadow-xl"
              >
                {currentUser ? 'Go to Dashboard' : 'Start Tracking Now'}
                <ArrowRight className="ml-3 h-5 w-5" />
              </button>
              
              <button 
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 font-semibold text-lg"
              >
                <Play className="mr-3 h-5 w-5" />
                See Demo Below
              </button>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                      <stat.icon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 dark:from-white dark:to-blue-300 bg-clip-text text-transparent mb-2">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Demo Section */}
      <section id="demo" className="py-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 dark:from-white dark:to-blue-300 bg-clip-text text-transparent mb-4 transition-colors duration-300">
              See It In Action
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 transition-colors duration-300">
              Experience the power of advanced trading analytics
            </p>
          </div>
          
          <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-8 shadow-2xl border border-gray-700/50">
            {/* Enhanced window controls */}
            <div className="absolute top-6 left-6 flex space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
            </div>
            
            <div className="mt-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-inner border border-gray-700/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Daily P&L</p>
                      <p className="text-3xl font-bold">+$1,247.83</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl">
                      <DollarSign className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-700 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Win Rate</p>
                      <p className="text-3xl font-bold">73.2%</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Target className="h-8 w-8 text-blue-200" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-pink-700 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Total Trades</p>
                      <p className="text-3xl font-bold">23</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl">
                      <BarChart3 className="h-8 w-8 text-purple-200" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 shadow-inner border border-gray-600/50">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-white font-semibold text-lg">Recent Trades</h4>
                </div>
                
                <div className="space-y-4">
                  {[
                    { symbol: 'AAPL', pl: '+$234.50', time: '10:23 AM', color: 'text-green-400', bg: 'from-green-500/20 to-emerald-500/20' },
                    { symbol: 'TSLA', pl: '+$445.20', time: '11:45 AM', color: 'text-green-400', bg: 'from-green-500/20 to-emerald-500/20' },
                    { symbol: 'MSFT', pl: '-$67.30', time: '2:15 PM', color: 'text-red-400', bg: 'from-red-500/20 to-pink-500/20' }
                  ].map((trade, index) => (
                    <div key={index} className={`flex items-center justify-between py-4 px-6 bg-gradient-to-r ${trade.bg} rounded-xl border border-gray-600/30`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                          <TrendingUp className="h-5 w-5 text-gray-300" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">{trade.symbol}</p>
                          <p className="text-gray-400 text-sm">{trade.time}</p>
                        </div>
                      </div>
                      <div className={`font-bold text-xl ${trade.color}`}>
                        {trade.pl}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 dark:from-white dark:to-blue-300 bg-clip-text text-transparent mb-4 transition-colors duration-300">
              Powerful Features for Serious Traders
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors duration-300">
              Everything you need to analyze, track, and optimize your trading performance in one comprehensive platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300/50 dark:hover:border-blue-700/50"
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-3xl flex items-center justify-center mb-8 shadow-lg`}>
                  <feature.icon className="h-10 w-10 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 dark:from-white dark:to-blue-300 bg-clip-text text-transparent mb-4 transition-colors duration-300">
              Loved by Traders Worldwide
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 transition-colors duration-300">
              See what our community has to say about their trading transformation
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-200/50 dark:border-gray-600/50"
              >
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                  ))}
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-8 italic leading-relaxed text-lg">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">
                      {testimonial.name}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-600 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Trading?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of traders who have already improved their performance with DayTradeTracker. 
            <br />
            <span className="font-semibold text-white">Start your journey to better trading today.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            <button 
              onClick={handleGetStarted}
              className="flex items-center px-8 py-4 bg-white text-blue-600 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold text-lg shadow-2xl"
            >
              {currentUser ? 'Go to Dashboard' : 'Start Free Trial'}
              <ArrowRight className="ml-3 h-5 w-5" />
            </button>
            
            <button 
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center px-8 py-4 border-2 border-white text-white rounded-2xl hover:bg-white hover:text-blue-600 transition-all duration-200 font-semibold text-lg backdrop-blur-sm"
            >
              <Play className="mr-3 h-5 w-5" />
              See Demo Above
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-8 text-blue-100">
            <div className="flex items-center hover:text-white transition-colors duration-200">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center hover:text-white transition-colors duration-200">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>14-Day Free Trial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-300 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 to-purple-600/10"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center mb-6">
                <div className="relative">
                  <TrendingUp className="h-8 w-8 text-blue-500 mr-3 drop-shadow-sm" />
                  <div className="absolute -inset-1 bg-blue-500/20 blur-sm rounded-full"></div>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
                  DayTradeTracker
                </span>
              </div>
              <p className="text-gray-400 max-w-md mb-6 lg:mb-0 leading-relaxed">
                The ultimate day trading tracker that transforms your trading data into actionable insights. 
                <span className="text-blue-400 font-medium">Master your trading performance with precision analytics.</span>
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-6 text-lg">Product</h4>
              <div className="space-y-3">
                <a href="#features" className="block hover:text-blue-400 transition-colors duration-200">Features</a>
                <a href="#demo" className="block hover:text-blue-400 transition-colors duration-200">Demo</a>
                <button onClick={handleGetStarted} className="block hover:text-blue-400 transition-colors duration-200 text-left">
                  {currentUser ? 'Dashboard' : 'Get Started'}
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-6 text-lg">Support</h4>
              <div className="space-y-3">
                <a href="#" className="block hover:text-blue-400 transition-colors duration-200">Help Center</a>
                <a href="#" className="block hover:text-blue-400 transition-colors duration-200">Contact Us</a>
                <a href="#" className="block hover:text-blue-400 transition-colors duration-200">Privacy Policy</a>
                <a href="#" className="block hover:text-blue-400 transition-colors duration-200">Terms of Service</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-16 pt-8 flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
            <p className="text-gray-400 text-center lg:text-left">
              © 2024 DayTradeTracker. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center text-green-400 hover:text-green-300 transition-colors duration-200">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium">All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};