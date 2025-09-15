// src/components/Tutorial.tsx - Fully Responsive Version
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
  DollarSign
} from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon: React.ComponentType<any>;
  optional?: boolean;
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
    description: 'Let\'s take a quick tour of the key features that will help you analyze and improve your trading performance.',
    targetSelector: '.main-header',
    position: 'bottom',
    icon: Play
  },
  {
    id: 'manual-entry',
    title: 'Add Your First Trade',
    description: 'Start by adding a trade manually. This form makes it easy to log your trades with all the important details.',
    targetSelector: '[data-tutorial="manual-trade-entry"]',
    position: 'right',
    icon: TrendingUp
  },
  {
    id: 'dashboard',
    title: 'Performance Dashboard',
    description: 'Your daily performance metrics are displayed here. Track your P&L, win rate, and key statistics at a glance.',
    targetSelector: '[data-tutorial="dashboard"]',
    position: 'bottom',
    icon: BarChart3
  },
  {
    id: 'calendar-nav',
    title: 'Calendar Navigation',
    description: 'Click here to view your trading calendar. See your performance across different days and identify patterns.',
    targetSelector: '[data-tutorial="calendar-nav"]',
    position: 'bottom',
    icon: Calendar
  },
  {
    id: 'daily-review',
    title: 'Daily Review',
    description: 'Get AI-powered insights and a grade for your daily trading performance. Perfect for tracking improvement over time.',
    targetSelector: '[data-tutorial="review-nav"]',
    position: 'bottom',
    icon: BookOpen
  },
  {
    id: 'stock-search',
    title: 'Stock Analysis',
    description: 'Analyze your performance on specific stocks. See which tickers are your most profitable and which need work.',
    targetSelector: '[data-tutorial="search-nav"]',
    position: 'bottom',
    icon: Search
  },
  {
    id: 'projections',
    title: 'Goals & Projections',
    description: 'Set earnings targets and see projections based on your trading performance. Plan your financial future!',
    targetSelector: '[data-tutorial="projections-nav"]',
    position: 'bottom',
    icon: Target
  }
];

// Responsive CSS styles
const tutorialStyles = `
  .tutorial-highlight {
    position: relative !important;
    z-index: 45 !important;
    border-radius: 8px !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 0 8px rgba(59, 130, 246, 0.1) !important;
    animation: tutorialPulse 2s infinite !important;
  }

  @keyframes tutorialPulse {
    0%, 100% {
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 0 8px rgba(59, 130, 246, 0.1) !important;
    }
    50% {
      box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.4), 0 0 0 12px rgba(59, 130, 246, 0.15) !important;
    }
  }

  .tutorial-overlay {
    pointer-events: none !important;
  }

  .tutorial-highlight {
    pointer-events: auto !important;
  }

  /* Mobile-specific animations */
  @media (max-width: 640px) {
    .tutorial-highlight {
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4), 0 0 0 4px rgba(59, 130, 246, 0.2) !important;
    }
    
    @keyframes tutorialPulse {
      0%, 100% {
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4), 0 0 0 4px rgba(59, 130, 246, 0.2) !important;
      }
      50% {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 0 0 0 6px rgba(59, 130, 246, 0.25) !important;
      }
    }
  }

  /* Touch-friendly interactions */
  @media (pointer: coarse) {
    .tutorial-tooltip button {
      min-height: 44px !important;
      min-width: 44px !important;
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

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter steps based on current view
  const availableSteps = TUTORIAL_STEPS.filter(step => {
    if (step.id === 'welcome') return true;
    if (currentView === 'daily' && ['manual-entry', 'dashboard'].includes(step.id)) return true;
    if (step.id.includes('-nav')) return true;
    return false;
  });

  const currentTutorialStep = availableSteps[currentStep];

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

  // Find and highlight target element
  useEffect(() => {
    if (!isOpen || !currentTutorialStep) return;

    const findElement = () => {
      const element = document.querySelector(currentTutorialStep.targetSelector) as HTMLElement;
      if (element) {
        setTargetElement(element);
        setIsVisible(true);
        
        // Scroll element into view with mobile considerations
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: isMobile ? 'start' : 'center',
          inline: 'center'
        });
        
        // Add highlight class
        element.classList.add('tutorial-highlight');
        
        return true;
      }
      return false;
    };

    // Try to find element immediately
    if (!findElement()) {
      // If not found, try again after a short delay
      const timeout = setTimeout(findElement, 500);
      return () => clearTimeout(timeout);
    }

    return () => {
      // Cleanup highlight
      const elements = document.querySelectorAll('.tutorial-highlight');
      elements.forEach(el => el.classList.remove('tutorial-highlight'));
    };
  }, [currentStep, currentTutorialStep, isOpen, isMobile]);

  // Calculate responsive tooltip position
  const getTooltipPosition = useCallback(() => {
    if (!targetElement || !currentTutorialStep) return { top: 0, left: 0 };

    const rect = targetElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Responsive tooltip dimensions
    const tooltipWidth = isMobile ? Math.min(viewportWidth - 32, 280) : 320;
    const tooltipHeight = isMobile ? 180 : 200;
    const offset = isMobile ? 12 : 20;

    let top = 0;
    let left = 0;

    // On mobile, prefer bottom positioning to avoid keyboard issues
    if (isMobile) {
      top = rect.bottom + offset;
      left = 16; // Fixed left margin on mobile
      
      // If tooltip would go off bottom, position above
      if (top + tooltipHeight > viewportHeight - 20) {
        top = rect.top - tooltipHeight - offset;
      }
      
      // If still off screen, center it
      if (top < 20) {
        top = Math.max(20, (viewportHeight - tooltipHeight) / 2);
      }
    } else {
      // Desktop positioning logic
      switch (currentTutorialStep.position) {
        case 'bottom':
          top = rect.bottom + offset;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'top':
          top = rect.top - tooltipHeight - offset;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + offset;
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - offset;
          break;
      }

      // Keep tooltip within viewport bounds
      if (left < 10) left = 10;
      if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10;
      if (top < 10) top = 10;
      if (top + tooltipHeight > viewportHeight - 10) top = viewportHeight - tooltipHeight - 10;
    }

    return { top, left, width: tooltipWidth };
  }, [targetElement, currentTutorialStep, isMobile]);

  const handleNext = () => {
    if (currentStep < availableSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen || !currentTutorialStep || !isVisible) {
    return null;
  }

  const position = getTooltipPosition();
  const Icon = currentTutorialStep.icon;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 tutorial-overlay" />
      
      {/* Tutorial Tooltip - Fully Responsive */}
      <div
        className="tutorial-tooltip fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          maxHeight: isMobile ? '80vh' : 'auto',
          overflow: isMobile ? 'auto' : 'visible'
        }}
      >
        {/* Header - Responsive */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base leading-tight">
                {currentTutorialStep.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Step {currentStep + 1} of {availableSteps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 flex-shrink-0 touch-manipulation"
            title="Skip tutorial"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Content - Responsive */}
        <div className="p-3 sm:p-4">
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3 sm:mb-4">
            {currentTutorialStep.description}
          </p>

          {/* Progress Bar - Responsive */}
          <div className="mb-3 sm:mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / availableSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentStep + 1) / availableSteps.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Navigation - Mobile Optimized */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center px-2 sm:px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            <div className="flex space-x-1 sm:space-x-2">
              <button
                onClick={handleSkip}
                className="px-2 sm:px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                {currentStep === availableSteps.length - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Finish</span>
                    <span className="sm:hidden">Done</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
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

// Responsive Tutorial Button Component
export const TutorialButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 touch-manipulation"
      title="Start tutorial"
      style={{ minHeight: '44px' }}
    >
      <HelpCircle className="h-4 w-4 mr-1 sm:mr-2" />
      <span className="hidden sm:inline">Tutorial</span>
      <span className="sm:hidden text-xs">Help</span>
    </button>
  );
};

// Fully Responsive Welcome Message Component
export const WelcomeMessage: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onStartTutorial: () => void;
  userName?: string;
}> = ({ isOpen, onClose, onStartTutorial, userName }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: TrendingUp,
      title: 'Track Every Trade',
      description: 'Log trades manually or connect your broker for automatic import'
    },
    {
      icon: Calendar,
      title: 'Visual Performance Calendar',
      description: 'See your daily P&L at a glance and identify patterns'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Deep insights into your trading performance and strategies'
    },
    {
      icon: Target,
      title: 'Goals & Projections',
      description: 'Set targets and track your progress toward financial goals'
    }
  ];

  const handleStartTutorial = () => {
    onClose();
    setTimeout(() => {
      onStartTutorial();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header with gradient background - Responsive */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-4 sm:p-6 rounded-t-2xl">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-2">
            Welcome to DayTradeTracker{userName ? `, ${userName}` : ''}!
          </h2>
          <p className="text-blue-100 text-center text-base sm:text-lg">
            Your journey to better trading starts here
          </p>
        </div>

        {/* Content - Responsive */}
        <div className="p-4 sm:p-6">
          {/* Introduction */}
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
              Transform Your Trading Performance
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base">
              DayTradeTracker helps you analyze patterns, track performance, and optimize your 
              trading strategy with powerful analytics and insights.
            </p>
          </div>

          {/* Features Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 sm:p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                    <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {feature.title}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats Preview - Responsive */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8 border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-center text-sm sm:text-base">
              What You'll Track
            </h4>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <div className="flex items-center justify-center mb-1 sm:mb-2">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Daily P&L</p>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1 sm:mb-2">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Win Rate</p>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1 sm:mb-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Best Times</p>
              </div>
            </div>
          </div>

          {/* What's Next - Responsive */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              What's Next?
            </h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center text-blue-800 dark:text-blue-200">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                Take a quick interactive tour of the key features
              </div>
              <div className="flex items-center text-blue-800 dark:text-blue-200">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                Add your first trade to get started
              </div>
              <div className="flex items-center text-blue-800 dark:text-blue-200">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                Explore your performance analytics
              </div>
            </div>
          </div>

          {/* Action Buttons - Responsive & Touch-Friendly */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleStartTutorial}
              className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Start Interactive Tour
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold text-sm sm:text-base touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              Skip & Explore
            </button>
          </div>

          {/* Small note - Responsive */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3 sm:mt-4">
            You can always restart the tutorial later from the help menu
          </p>
        </div>
      </div>
    </div>
  );
};

// Tutorial Manager Hook (unchanged but included for completeness)
export const useTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    const tutorialStatus = localStorage.getItem('daytrader-tutorial-completed');
    const welcomeStatus = localStorage.getItem('daytrader-welcome-seen');
    const hasCompletedTutorial = tutorialStatus === 'true';
    const hasSeenWelcomeMessage = welcomeStatus === 'true';
    
    setHasSeenTutorial(hasCompletedTutorial);
    setHasSeenWelcome(hasSeenWelcomeMessage);

    // Show welcome message for completely new users
    if (!hasSeenWelcomeMessage) {
      const timer = setTimeout(() => {
        setShowWelcome(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
    // Show tutorial for users who have seen welcome but not completed tutorial
    else if (!hasCompletedTutorial) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem('daytrader-tutorial-completed', 'true');
    setHasSeenTutorial(true);
    setShowTutorial(false);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const closeWelcome = useCallback(() => {
    localStorage.setItem('daytrader-welcome-seen', 'true');
    setHasSeenWelcome(true);
    setShowWelcome(false);
  }, []);

  const startTutorialFromWelcome = useCallback(() => {
    localStorage.setItem('daytrader-welcome-seen', 'true');
    setHasSeenWelcome(true);
    setShowWelcome(false);
    // Start tutorial after a brief delay
    setTimeout(() => {
      setShowTutorial(true);
    }, 300);
  }, []);

  return {
    showTutorial,
    showWelcome,
    hasSeenTutorial,
    hasSeenWelcome,
    startTutorial,
    completeTutorial,
    closeTutorial,
    closeWelcome,
    startTutorialFromWelcome
  };
};