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
  EyeOff,
  Menu,
  X,
  LogIn,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface HomePageProps {
  onGetStarted: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGetStarted }) => {
  const { currentUser, signInWithGoogle } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoVisible, setDemoVisible] = useState(true);
  const [darkMode, setDarkMode] = useLocalStorage('day-trader-dark-mode', false);

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleGetStarted = async () => {
    if (currentUser) {
      onGetStarted();
    } else {
      try {
        await signInWithGoogle();
        onGetStarted();
      } catch (error) {
        console.error('Failed to sign in:', error);
      }
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                DayTradeTracker
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                Features
              </a>
              <a href="#demo" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                See Demo
              </a>
              <a href="#testimonials" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                Reviews
              </a>
              
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md transition-colors"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              <button 
                onClick={handleGetStarted}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {currentUser ? 'Go to App' : 'Get Started'}
              </button>
            </div>

            {/* Mobile Right Side Controls */}
            <div className="flex items-center space-x-2 md:hidden">
              {/* Mobile Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md transition-colors"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-md transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="flex flex-col space-y-4">
                <a 
                  href="#features" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-4 py-2 rounded-md transition-colors"
                >
                  Features
                </a>
                <a 
                  href="#demo" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-4 py-2 rounded-md transition-colors"
                >
                  Demo
                </a>
                <a 
                  href="#testimonials" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-4 py-2 rounded-md transition-colors"
                >
                  Reviews
                </a>
                <button 
                  onClick={() => {
                    handleGetStarted();
                    setMobileMenuOpen(false);
                  }}
                  className="mx-4 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {currentUser ? 'Go to App' : 'Get Started'}
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 transition-colors">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <div className="mb-8">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mb-8 transition-colors">
                <Star className="h-4 w-4 mr-2" />
                Trusted by 1,200+ Active Traders
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-8 transition-colors">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                Master Your Trading
              </span>
              <br />
              <span className="text-gray-800 dark:text-gray-200 transition-colors">Performance</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed transition-colors">
              The ultimate day trading tracker that transforms your trading data into actionable insights. 
              Analyze patterns, track performance, and optimize your strategy with precision.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button 
                onClick={handleGetStarted}
                className="group flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 font-semibold text-lg shadow-xl"
              >
                {currentUser ? 'Go to Dashboard' : 'Start Tracking Now'}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 font-semibold text-lg"
              >
                <Play className="mr-2 h-5 w-5" />
                See Demo Below
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 font-medium transition-colors">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section - Always Visible */}
      <section id="demo" className="py-20 bg-white dark:bg-gray-800 transition-colors">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
                See It In Action
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 transition-colors">
                Experience the power of advanced trading analytics
              </p>
            </div>
            
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl">
              <div className="absolute top-4 left-4 flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              
              <div className="mt-8 bg-gray-800 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Daily P&L</p>
                        <p className="text-2xl font-bold">+$1,247.83</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Win Rate</p>
                        <p className="text-2xl font-bold">73.2%</p>
                      </div>
                      <Target className="h-8 w-8 text-blue-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Total Trades</p>
                        <p className="text-2xl font-bold">23</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-200" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold">Recent Trades</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { symbol: 'AAPL', pl: '+$234.50', time: '10:23 AM', color: 'text-green-400' },
                      { symbol: 'TSLA', pl: '+$445.20', time: '11:45 AM', color: 'text-green-400' },
                      { symbol: 'MSFT', pl: '-$67.30', time: '2:15 PM', color: 'text-red-400' }
                    ].map((trade, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-600 rounded">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-gray-300" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{trade.symbol}</p>
                            <p className="text-gray-400 text-sm">{trade.time}</p>
                          </div>
                        </div>
                        <div className={`font-bold ${trade.color}`}>
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

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
              Powerful Features for Serious Traders
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors">
              Everything you need to analyze, track, and optimize your trading performance in one comprehensive platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white dark:bg-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
              Loved by Traders Worldwide
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 transition-colors">
              See what our community has to say about their trading transformation
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-6 italic leading-relaxed transition-colors">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900 dark:text-white transition-colors">
                      {testimonial.name}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Trading?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of traders who have already improved their performance with DayTradeTracker. 
            Start your journey to better trading today.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleGetStarted}
              className="group flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 font-semibold text-lg shadow-xl"
            >
              {currentUser ? 'Go to Dashboard' : 'Start Free Trial'}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button 
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center px-8 py-4 border-2 border-white text-white rounded-xl hover:bg-white hover:text-blue-600 transition-all duration-300 font-semibold text-lg"
            >
              <Play className="mr-2 h-5 w-5" />
              See Demo Above
            </button>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-blue-100">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>14-Day Free Trial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center mb-4">
                <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
                <span className="text-xl font-bold text-white">DayTradeTracker</span>
              </div>
              <p className="text-gray-400 max-w-md mb-6 lg:mb-0">
                The ultimate day trading tracker that transforms your trading data into actionable insights. 
                Master your trading performance with precision analytics.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <div className="space-y-2">
                <a href="#features" className="block hover:text-blue-400 transition-colors">Features</a>
                <a href="#demo" className="block hover:text-blue-400 transition-colors">Demo</a>
                <button onClick={handleGetStarted} className="block hover:text-blue-400 transition-colors text-left">
                  {currentUser ? 'Dashboard' : 'Get Started'}
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <div className="space-y-2">
                <a href="#" className="block hover:text-blue-400 transition-colors">Help Center</a>
                <a href="#" className="block hover:text-blue-400 transition-colors">Contact Us</a>
                <a href="#" className="block hover:text-blue-400 transition-colors">Privacy Policy</a>
                <a href="#" className="block hover:text-blue-400 transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            <p className="text-gray-400 text-center lg:text-left">
              © 2024 DayTradeTracker. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm">All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};