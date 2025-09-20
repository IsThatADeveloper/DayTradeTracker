import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Calendar, 
  BarChart3, 
  Target,
  Search,
  TrendingUp,
  BookOpen,
  HelpCircle,
  Sparkles,
  Clock,
  DollarSign,
  Link,
  Globe,
  RefreshCw,
  LineChart,
  FileText,
  User,
  Sun,
  Menu
} from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  fallbackSelector?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon: React.ComponentType<any>;
  optional?: boolean;
  requiredView?: string;
  mobilePosition?: 'top' | 'bottom' | 'center';
}

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentView: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DayTradeTracker!',
    description: 'Let\'s take a comprehensive tour of all the features that will help you analyze and improve your trading performance.',
    targetSelector: '.main-header',
    fallbackSelector: 'header',
    position: 'bottom',
    mobilePosition: 'center',
    icon: Play
  },
  {
    id: 'date-picker',
    title: 'Select Your Trading Date',
    description: 'Use this date picker to view trades from any specific day. All data will filter based on your selected date.',
    targetSelector: 'input[type="date"]',
    fallbackSelector: '.absolute.left-1\\/2',
    position: 'bottom',
    mobilePosition: 'bottom',
    icon: Calendar,
    requiredView: 'daily'
  },
  {
    id: 'manual-entry',
    title: 'Add Your First Trade',
    description: 'Start by adding a trade manually. Fill in ticker, entry/exit prices, quantity, and direction.',
    targetSelector: '[data-tutorial="manual-trade-entry"]',
    fallbackSelector: '.grid > div:first-child',
    position: 'right',
    mobilePosition: 'bottom',
    icon: TrendingUp,
    requiredView: 'daily'
  },
  {
    id: 'bulk-import',
    title: 'Bulk Import Trades',
    description: 'Import multiple trades at once using CSV format or copy-paste from your broker statements.',
    targetSelector: '.grid.grid-cols-1.lg\\:grid-cols-2 > div:nth-child(2)',
    fallbackSelector: '.grid > div:nth-child(2)',
    position: 'left',
    mobilePosition: 'bottom',
    icon: FileText,
    requiredView: 'daily'
  },
  {
    id: 'dashboard',
    title: 'Performance Dashboard',
    description: 'Your daily performance metrics are displayed here. Track your P&L, win rate, and total trades.',
    targetSelector: '[data-tutorial="dashboard"]',
    fallbackSelector: '.space-y-6 > div:nth-child(3)',
    position: 'bottom',
    mobilePosition: 'bottom',
    icon: BarChart3,
    requiredView: 'daily'
  },
  {
    id: 'calendar-nav',
    title: 'Trading Calendar View',
    description: 'Switch to calendar view to see your daily P&L across the entire month.',
    targetSelector: '[data-tutorial="calendar-nav"]',
    fallbackSelector: 'button[data-tutorial="calendar-nav"]',
    position: 'bottom',
    mobilePosition: 'bottom',
    icon: Calendar
  },
  {
    id: 'review-nav',
    title: 'Daily Review & Grading',
    description: 'Get a detailed grade for each trading day and track your improvement.',
    targetSelector: '[data-tutorial="review-nav"]',
    fallbackSelector: 'button[data-tutorial="review-nav"]',
    position: 'bottom',
    mobilePosition: 'bottom',
    icon: BookOpen
  },
  {
    id: 'search-nav',
    title: 'Stock Analysis',
    description: 'Analyze your performance on individual stocks and see your most profitable tickers.',
    targetSelector: '[data-tutorial="search-nav"]',
    fallbackSelector: 'button[data-tutorial="search-nav"]',
    position: 'bottom',
    mobilePosition: 'bottom',
    icon: Search
  },
  {
    id: 'brokers-nav',
    title: 'Broker Integration',
    description: 'Connect your brokerage accounts to automatically import trades.',
    targetSelector: '[data-tutorial="brokers-nav"]',
    fallbackSelector: 'button[data-tutorial="brokers-nav"]',
    position: 'bottom',
    mobilePosition: 'bottom',
    icon: Link
  },
  {
    id: 'completion',
    title: 'You\'re All Set!',
    description: 'Congratulations! You now know the key features. Start adding trades or exploring the dashboard.',
    targetSelector: '.main-header',
    fallbackSelector: 'header',
    position: 'center',
    mobilePosition: 'center',
    icon: CheckCircle
  }
];

const tutorialStyles = `
  .tutorial-highlight {
    position: relative !important;
    z-index: 45 !important;
    border-radius: 12px !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4), 0 0 0 6px rgba(59, 130, 246, 0.2) !important;
    animation: tutorialPulse 2s infinite !important;
    transition: all 0.3s ease-in-out !important;
  }

  @keyframes tutorialPulse {
    0%, 100% {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4), 0 0 0 6px rgba(59, 130, 246, 0.2) !important;
    }
    50% {
      box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.5), 0 0 0 10px rgba(59, 130, 246, 0.25) !important;
    }
  }

  .tutorial-overlay {
    pointer-events: none !important;
    backdrop-filter: blur(1px) !important;
  }

  .tutorial-highlight {
    pointer-events: auto !important;
  }

  .tutorial-tooltip {
    backdrop-filter: blur(20px) !important;
    border: 2px solid rgba(59, 130, 246, 0.2) !important;
  }

  @media (max-width: 768px) {
    .tutorial-tooltip {
      max-width: calc(100vw - 16px) !important;
      margin: 8px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tutorial-highlight {
      animation: none !important;
    }
  }
`;

export const Tutorial: React.FC<TutorialProps> = ({ 
  isOpen, 
  onClose, 
  onComplete,
  currentView 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });
  const [elementSearchAttempts, setElementSearchAttempts] = useState(0);

  // Device detection
  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewportDimensions({ width, height });
      setIsMobile(width < 640);
    };
    
    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    return () => window.removeEventListener('resize', updateDeviceInfo);
  }, []);

  // Filter steps based on current view and user context
  const availableSteps = TUTORIAL_STEPS.filter(step => {
    // Always include welcome and completion steps
    if (step.id === 'welcome' || step.id === 'completion') return true;
    
    // Filter by required view
    if (step.requiredView && step.requiredView !== currentView) return false;
    
    // Include navigation steps (they should always be available)
    if (step.id.includes('-nav')) return true;
    
    // Include view-specific steps for daily view
    if (currentView === 'daily' && ['date-picker', 'manual-entry', 'bulk-import', 'dashboard'].includes(step.id)) {
      return true;
    }
    
    return false;
  });

  const currentTutorialStep = availableSteps[currentStep];

  // Simplified element finder
  const findTargetElement = useCallback((step: TutorialStep): HTMLElement | null => {
    try {
      // Try primary selector
      let element = document.querySelector(step.targetSelector) as HTMLElement;
      if (element && element.offsetParent !== null) {
        return element;
      }

      // Try fallback selector
      if (step.fallbackSelector) {
        element = document.querySelector(step.fallbackSelector) as HTMLElement;
        if (element && element.offsetParent !== null) {
          return element;
        }
      }

      // For center positioning, use body
      if (step.position === 'center') {
        return document.body;
      }
    } catch (error) {
      console.warn('Error finding tutorial element:', error);
    }

    return null;
  }, []);

  // Element detection with simplified retry logic
  useEffect(() => {
    if (!isOpen || !currentTutorialStep) return;

    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const attemptToFindElement = () => {
      if (!mounted) return;

      const element = findTargetElement(currentTutorialStep);
      
      if (element) {
        setTargetElement(element);
        setIsVisible(true);
        setElementSearchAttempts(0);
        
        // Scroll into view
        try {
          element.scrollIntoView({
            behavior: 'smooth',
            block: isMobile ? 'start' : 'center',
            inline: 'center'
          });
          
          // Add highlight
          setTimeout(() => {
            if (mounted) {
              element.classList.add('tutorial-highlight');
            }
          }, 300);
        } catch (error) {
          console.warn('Error scrolling to element:', error);
        }
        
        return true;
      }
      
      return false;
    };

    // Immediate attempt
    if (!attemptToFindElement()) {
      // Retry with delay
      const retryInterval = setInterval(() => {
        if (!mounted) {
          clearInterval(retryInterval);
          return;
        }

        retryCount++;
        setElementSearchAttempts(retryCount);
        
        if (attemptToFindElement() || retryCount >= maxRetries) {
          clearInterval(retryInterval);
          
          if (retryCount >= maxRetries) {
            // For center-positioned or optional steps, continue anyway
            if (currentTutorialStep.position === 'center' || currentTutorialStep.optional) {
              setIsVisible(true);
              setTargetElement(document.body);
            } else {
              // Auto-skip missing elements
              setTimeout(() => {
                if (mounted) {
                  handleNext();
                }
              }, 500);
            }
          }
        }
      }, 500);

      return () => {
        mounted = false;
        clearInterval(retryInterval);
      };
    }

    return () => {
      mounted = false;
      // Cleanup highlights
      const elements = document.querySelectorAll('.tutorial-highlight');
      elements.forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [currentStep, currentTutorialStep, isOpen, isMobile, findTargetElement]);

  // Responsive tooltip positioning
  const getTooltipPosition = useCallback(() => {
    if (!targetElement || !currentTutorialStep) {
      return { top: 50, left: 50, width: isMobile ? viewportDimensions.width - 32 : 320 };
    }

    const rect = targetElement.getBoundingClientRect();
    const { width: viewportWidth, height: viewportHeight } = viewportDimensions;
    
    let tooltipWidth = isMobile ? Math.min(viewportWidth - 24, 300) : 320;
    let tooltipHeight = 200;

    const offset = isMobile ? 16 : 24;
    let top = 0;
    let left = 0;

    const position = isMobile && currentTutorialStep.mobilePosition 
      ? currentTutorialStep.mobilePosition 
      : currentTutorialStep.position;

    switch (position) {
      case 'center':
        top = (viewportHeight - tooltipHeight) / 2;
        left = (viewportWidth - tooltipWidth) / 2;
        break;
        
      case 'bottom':
        top = rect.bottom + offset;
        left = isMobile ? 12 : Math.max(12, Math.min(rect.left + (rect.width / 2) - (tooltipWidth / 2), viewportWidth - tooltipWidth - 12));
        break;
        
      case 'top':
        top = rect.top - tooltipHeight - offset;
        left = isMobile ? 12 : Math.max(12, Math.min(rect.left + (rect.width / 2) - (tooltipWidth / 2), viewportWidth - tooltipWidth - 12));
        break;
        
      case 'right':
        if (isMobile) {
          top = rect.bottom + offset;
          left = 12;
        } else {
          top = Math.max(12, rect.top + (rect.height / 2) - (tooltipHeight / 2));
          left = rect.right + offset;
        }
        break;
        
      case 'left':
        if (isMobile) {
          top = rect.bottom + offset;
          left = 12;
        } else {
          top = Math.max(12, rect.top + (rect.height / 2) - (tooltipHeight / 2));
          left = rect.left - tooltipWidth - offset;
        }
        break;
    }

    // Boundary checking
    const margin = 12;
    const bottomMargin = isMobile ? 80 : margin;
    
    if (left < margin) left = margin;
    if (left + tooltipWidth > viewportWidth - margin) {
      left = viewportWidth - tooltipWidth - margin;
    }
    if (top < margin) top = margin;
    if (top + tooltipHeight > viewportHeight - bottomMargin) {
      top = Math.max(margin, viewportHeight - tooltipHeight - bottomMargin);
    }

    return { top, left, width: tooltipWidth };
  }, [targetElement, currentTutorialStep, isMobile, viewportDimensions]);

  const handleNext = () => {
    if (currentStep < availableSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setElementSearchAttempts(0);
      setIsVisible(false);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setElementSearchAttempts(0);
      setIsVisible(false);
    }
  };

  const handleComplete = () => {
    try {
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error completing tutorial:', error);
      onClose();
    }
  };

  const handleSkip = () => {
    try {
      onClose();
    } catch (error) {
      console.error('Error closing tutorial:', error);
    }
  };

  // Inject CSS styles
  useEffect(() => {
    if (!isOpen) return;

    const styleElement = document.createElement('style');
    styleElement.textContent = tutorialStyles;
    styleElement.id = 'tutorial-styles';
    document.head.appendChild(styleElement);

    return () => {
      const existingStyle = document.getElementById('tutorial-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [isOpen]);

  if (!isOpen || !currentTutorialStep || availableSteps.length === 0) {
    return null;
  }

  // Loading state for element search
  if (!isVisible && !(currentTutorialStep.position === 'center' || currentTutorialStep.optional)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="font-semibold text-gray-900 mb-2">Finding Tutorial Element</h3>
            <p className="text-gray-700 text-sm mb-4">
              Looking for: {currentTutorialStep.title}
              {elementSearchAttempts > 0 && ` (${elementSearchAttempts}/3)`}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Skip Step
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                End Tutorial
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const position = getTooltipPosition();
  const Icon = currentTutorialStep.icon;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 tutorial-overlay" />
      
      {/* Tutorial Tooltip */}
      <div
        className="tutorial-tooltip fixed z-50 bg-white rounded-2xl shadow-2xl border"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          maxHeight: isMobile ? '85vh' : '80vh',
          overflow: 'auto'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">
                {currentTutorialStep.title}
              </h3>
              <span className="text-sm text-blue-600 font-medium">
                Step {currentStep + 1} of {availableSteps.length}
              </span>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
            title="Skip tutorial"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-gray-700 text-base leading-relaxed mb-5">
            {currentTutorialStep.description}
          </p>

          {/* Progress Bar */}
          <div className="mb-5">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span className="font-medium">Progress</span>
              <span className="font-semibold">{Math.round(((currentStep + 1) / availableSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${((currentStep + 1) / availableSteps.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Completion Message */}
          {currentTutorialStep.id === 'completion' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-semibold text-green-800">Tutorial Complete!</span>
              </div>
              <p className="text-sm text-green-700">
                You can restart this tutorial anytime from the help menu.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center px-4 py-3 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            <div className="flex space-x-2">
              <button
                onClick={currentTutorialStep.id === 'completion' ? handleComplete : handleSkip}
                className="px-4 py-3 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                {currentTutorialStep.id === 'completion' ? 'Close' : 'Skip All'}
              </button>
              
              <button
                onClick={handleNext}
                className="flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg"
              >
                {currentStep === availableSteps.length - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Tutorial Button Component
export const TutorialButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-200 shadow-sm hover:shadow-md"
      title="Start tutorial"
    >
      <HelpCircle className="h-5 w-5 mr-2" />
      <span className="font-semibold">Tutorial</span>
      <div className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">?</div>
    </button>
  );
};

// Welcome Message Component
export const WelcomeMessage: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onStartTutorial: () => void;
  userName?: string;
}> = ({ isOpen, onClose, onStartTutorial, userName }) => {
  if (!isOpen) return null;

  const handleStartTutorial = () => {
    onClose();
    setTimeout(() => {
      onStartTutorial();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-600 text-white p-8 rounded-t-3xl relative overflow-hidden">
          <div className="relative">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Sparkles className="h-10 w-10 animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-center mb-4">
              Welcome to DayTradeTracker{userName && (
                <span className="block text-xl font-normal text-blue-100 mt-2">
                  Hello, {userName}!
                </span>
              )}
            </h2>
            <p className="text-blue-100 text-center text-xl leading-relaxed">
              Transform your trading with intelligent analytics
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Your Complete Trading Analytics Platform
            </h3>
            <p className="text-gray-600 leading-relaxed text-lg">
              Track trades, analyze patterns, and optimize your trading strategy with powerful insights.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[
              { icon: TrendingUp, title: 'Smart Trade Tracking', desc: 'Log trades manually or connect your broker' },
              { icon: BarChart3, title: 'Performance Analytics', desc: 'Deep insights into your trading patterns' },
              { icon: Calendar, title: 'Visual Calendar', desc: 'See your daily P&L at a glance' },
              { icon: Target, title: 'Goals & Projections', desc: 'Set targets and track progress' }
            ].map((feature, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-2xl">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-600 rounded-lg mr-3">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900">{feature.title}</h4>
                </div>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleStartTutorial}
              className="flex items-center justify-center px-8 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 font-bold text-lg shadow-xl"
            >
              <Sparkles className="h-6 w-6 mr-3" />
              Start Tutorial
              <ArrowRight className="h-5 w-5 ml-3" />
            </button>
            
            <button
              onClick={onClose}
              className="flex items-center justify-center px-8 py-5 border-2 border-gray-300 text-gray-700 rounded-2xl hover:border-blue-500 hover:text-blue-600 hover:bg-gray-50 font-bold text-lg"
            >
              Skip & Start Trading
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              You can restart the tutorial anytime from the help menu
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tutorial Manager Hook - Using React state instead of localStorage
export const useTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true); // Show welcome by default
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [tutorialProgress, setTutorialProgress] = useState(0);

  const startTutorial = useCallback(() => {
    setShowTutorial(true);
    setTutorialProgress(0);
  }, []);

  const completeTutorial = useCallback(() => {
    setHasSeenTutorial(true);
    setHasSeenWelcome(true);
    setShowTutorial(false);
    setTutorialProgress(100);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const closeWelcome = useCallback(() => {
    setHasSeenWelcome(true);
    setShowWelcome(false);
  }, []);

  const startTutorialFromWelcome = useCallback(() => {
    setHasSeenWelcome(true);
    setShowWelcome(false);
    setTimeout(() => {
      setShowTutorial(true);
      setTutorialProgress(0);
    }, 300);
  }, []);

  const resetTutorial = useCallback(() => {
    setHasSeenTutorial(false);
    setHasSeenWelcome(false);
    setTutorialProgress(0);
    setShowTutorial(false);
    setShowWelcome(false);
    setTimeout(() => setShowWelcome(true), 500);
  }, []);

  return {
    showTutorial,
    showWelcome,
    hasSeenTutorial,
    hasSeenWelcome,
    tutorialProgress,
    startTutorial,
    completeTutorial,
    closeTutorial,
    closeWelcome,
    startTutorialFromWelcome,
    resetTutorial,
    setTutorialProgress
  };
};

// Demo App
const DemoApp = () => {
  const {
    showTutorial,
    showWelcome,
    startTutorial,
    completeTutorial,
    closeTutorial,
    closeWelcome,
    startTutorialFromWelcome
  } = useTutorial();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="main-header bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">DayTradeTracker</h1>
          <div className="flex space-x-4">
            <TutorialButton onClick={startTutorial} />
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div data-tutorial="manual-trade-entry" className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Add Trade</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Ticker" className="w-full px-3 py-2 border rounded-lg" />
            <input type="number" placeholder="Entry Price" className="w-full px-3 py-2 border rounded-lg" />
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Add Trade
            </button>
          </div>
        </div>

        <div data-tutorial="dashboard" className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Performance Dashboard</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+$250</div>
              <div className="text-sm text-gray-500">Today's P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">75%</div>
              <div className="text-sm text-gray-500">Win Rate</div>
            </div>
          </div>
        </div>
      </div>

      <Tutorial 
        isOpen={showTutorial}
        onClose={closeTutorial}
        onComplete={completeTutorial}
        currentView="daily"
      />

      <WelcomeMessage
        isOpen={showWelcome}
        onClose={closeWelcome}
        onStartTutorial={startTutorialFromWelcome}
        userName="Trader"
      />
    </div>
  );
};

export default DemoApp;