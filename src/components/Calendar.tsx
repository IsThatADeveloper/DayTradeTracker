// src/components/Calendar.tsx - Enhanced Calendar with CSV Upload and Weekly P&L Display
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Clock, 
  ChevronDown, 
  BarChart3, 
  DollarSign,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  isWithinInterval,
  startOfDay,
  endOfDay,
  isBefore,
  differenceInDays,
  subDays,
  startOfYear,
  parse
} from 'date-fns';

// Types
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';

interface CalendarProps {
  trades: Trade[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  currentMonth: Date;
  onDateDoubleClick?: (date: Date) => void;
  onChartViewChange?: (view: string) => void;
  onTradesAdded?: (trades: Trade[]) => void;
}

// CSV Upload Result Interface
interface CSVUploadResult {
  success: boolean;
  tradesImported: number;
  errors: string[];
  warnings: string[];
}

// Additional type definitions for calendar data
interface DayData {
  date: Date;
  totalPL: number;
  tradeCount: number;
  hasData: boolean;
  isCurrentMonth: boolean;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  totalPL: number;
  tradeCount: number;
  hasData: boolean;
  days: DayData[];
}

interface MonthData {
  month: Date;
  monthName: string;
  days: DayData[];
  monthlyPL: number;
  monthlyTrades: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_MOBILE = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Custom range presets
const RANGE_PRESETS = [
  { label: 'Today', value: 'today', days: 0 },
  { label: 'Last 7 Days', value: '7d', days: 7 },
  { label: 'Last 30 Days', value: '30d', days: 30 },
  { label: 'Last 60 Days', value: '60d', days: 60 },
  { label: 'Last 90 Days', value: '90d', days: 90 },
  { label: 'This Month', value: 'thisMonth', days: null },
  { label: 'This Year', value: 'thisYear', days: null },
  { label: 'Custom Range', value: 'custom', days: null },
];

// Chart view options
const CHART_VIEWS = [
  { label: '1 Month', value: '1m' },
  { label: '1 Year', value: '1y' },
  { label: 'YTD', value: 'all' },
];

export const Calendar: React.FC<CalendarProps> = ({
  trades,
  selectedDate,
  onDateSelect,
  onMonthChange,
  currentMonth,
  onDateDoubleClick,
  onChartViewChange,
  onTradesAdded,
}) => {
  // Two-date selection state
  const [firstDate, setFirstDate] = useState<Date | null>(null);
  const [secondDate, setSecondDate] = useState<Date | null>(null);
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Dropdown states
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [showChartDropdown, setShowChartDropdown] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string>('');
  const [selectedChartView, setSelectedChartView] = useState<string>('1m');

  // Commission states
  const [applyCommission, setApplyCommission] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState<number>(0);

  // CSV Upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for dropdown management
  const rangeDropdownRef = useRef<HTMLDivElement>(null);
  const chartDropdownRef = useRef<HTMLDivElement>(null);

  // Clear date selection
  const clearSelection = useCallback(() => {
    setFirstDate(null);
    setSecondDate(null);
    setSelectedRange('');
  }, []);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(event.target as Node)) {
        setShowRangeDropdown(false);
      }
      if (chartDropdownRef.current && !chartDropdownRef.current.contains(event.target as Node)) {
        setShowChartDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get earliest and latest trade dates
  const tradeDataRange = useMemo(() => {
    if (trades.length === 0) return { earliest: new Date(), latest: new Date() };

    const dates = trades.map(trade =>
      trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp)
    );

    return {
      earliest: new Date(Math.min(...dates.map(d => d.getTime()))),
      latest: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }, [trades]);

  // Calculate adjusted P&L with commission
  const getAdjustedPL = useCallback((pl: number, tradeCount: number): number => {
    if (!applyCommission || commissionAmount === 0) return pl;
    return pl - (commissionAmount * tradeCount);
  }, [applyCommission, commissionAmount]);

  // CSV Parsing Function
  const parseCSV = useCallback((csvText: string): CSVUploadResult => {
    const result: CSVUploadResult = {
      success: false,
      tradesImported: 0,
      errors: [],
      warnings: []
    };

    // Helper function to parse direction with proper typing
    const parseDirection = (directionValue: string) => {
      const normalized = directionValue.toLowerCase();
      if (normalized.includes('long') || normalized.includes('buy')) {
        return 'long' as const;
      }
      return 'short' as const;
    };

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        result.errors.push('CSV file is empty or has no data rows');
        return result;
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Common header variations
      const headerMap: { [key: string]: string[] } = {
        timestamp: ['time', 'timestamp', 'date', 'datetime', 'date/time'],
        ticker: ['ticker', 'symbol', 'stock', 'instrument'],
        direction: ['direction', 'side', 'type', 'action', 'buy/sell'],
        quantity: ['quantity', 'qty', 'shares', 'amount', 'size'],
        entryPrice: ['entry price', 'entry', 'buy price', 'open price', 'price'],
        exitPrice: ['exit price', 'exit', 'sell price', 'close price'],
        realizedPL: ['realized p&l', 'realized pl', 'p&l', 'pl', 'profit/loss', 'profit', 'pnl'],
        notes: ['notes', 'note', 'comment', 'comments', 'description']
      };

      // Find column indices
      const columnIndices: { [key: string]: number } = {};
      for (const [key, variations] of Object.entries(headerMap)) {
        const index = header.findIndex(h => variations.some(v => h.includes(v)));
        if (index !== -1) {
          columnIndices[key] = index;
        }
      }

      // Validate required columns
      const requiredColumns = ['timestamp', 'ticker', 'direction', 'quantity', 'entryPrice', 'exitPrice', 'realizedPL'];
      const missingColumns = requiredColumns.filter(col => columnIndices[col] === undefined);
      
      if (missingColumns.length > 0) {
        result.errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
        result.warnings.push('Expected columns: Time/Date, Ticker/Symbol, Direction/Side, Quantity, Entry Price, Exit Price, Realized P&L');
        return result;
      }

      // Parse data rows
      const newTrades: Trade[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // Handle quoted values (CSV with commas in quotes)
          const values: string[] = [];
          let currentValue = '';
          let insideQuotes = false;
          
          for (let char of line) {
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim());

          // Parse timestamp - try multiple formats
          const timestampStr = values[columnIndices.timestamp]?.replace(/"/g, '') || '';
          let timestamp: Date = new Date(); // Initialize with default
          
          // Try various date formats
          const dateFormats = [
            'M/d/yyyy H:mm:ss',
            'M/d/yyyy h:mm:ss a',
            'yyyy-MM-dd HH:mm:ss',
            'yyyy-MM-dd\'T\'HH:mm:ss',
            'MM/dd/yyyy HH:mm:ss',
            'dd/MM/yyyy HH:mm:ss',
            'M/d/yyyy',
            'yyyy-MM-dd'
          ];

          let parsed = false;
          for (const dateFormat of dateFormats) {
            try {
              const parsedDate = parse(timestampStr, dateFormat, new Date());
              if (!isNaN(parsedDate.getTime())) {
                timestamp = parsedDate;
                parsed = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!parsed) {
            // Try native Date parsing as fallback
            const fallbackDate = new Date(timestampStr);
            if (isNaN(fallbackDate.getTime())) {
              result.warnings.push(`Row ${i + 1}: Invalid date format "${timestampStr}"`);
              continue;
            }
            timestamp = fallbackDate;
          }

          const ticker = values[columnIndices.ticker]?.replace(/"/g, '').toUpperCase() || '';
          const directionValue = values[columnIndices.direction]?.replace(/"/g, '') || 'long';
          const quantity = parseFloat(values[columnIndices.quantity]?.replace(/[^0-9.-]/g, '') || '0');
          const entryPrice = parseFloat(values[columnIndices.entryPrice]?.replace(/[^0-9.-]/g, '') || '0');
          const exitPrice = parseFloat(values[columnIndices.exitPrice]?.replace(/[^0-9.-]/g, '') || '0');
          const realizedPL = parseFloat(values[columnIndices.realizedPL]?.replace(/[^0-9.-]/g, '') || '0');
          const notes = columnIndices.notes !== undefined ? values[columnIndices.notes]?.replace(/"/g, '') : '';

          // Validate data
          if (!ticker || quantity <= 0 || entryPrice <= 0 || exitPrice <= 0) {
            result.warnings.push(`Row ${i + 1}: Invalid data - skipping`);
            continue;
          }

          // Create trade with proper direction
          const tradeDirection = parseDirection(directionValue);
          
          const trade: Trade = {
            id: `csv-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: timestamp,
            ticker: ticker,
            direction: tradeDirection,
            quantity: quantity,
            entryPrice: entryPrice,
            exitPrice: exitPrice,
            realizedPL: realizedPL,
            notes: notes || `Imported from CSV`,
            updateCount: 0,
            lastUpdated: new Date()
          };

          newTrades.push(trade);
        } catch (error) {
          result.warnings.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
        }
      }

      if (newTrades.length > 0) {
        result.success = true;
        result.tradesImported = newTrades.length;
        
        console.log('📊 CSV Parse Success:', {
          tradesImported: newTrades.length,
          sampleTrade: newTrades[0],
          hasCallback: !!onTradesAdded
        });
        
        // Call the callback to add trades
        if (onTradesAdded) {
          console.log('🚀 Calling onTradesAdded with', newTrades.length, 'trades');
          onTradesAdded(newTrades);
          console.log('✅ onTradesAdded callback completed');
        } else {
          console.warn('⚠️ onTradesAdded callback is not defined!');
        }
      } else {
        result.errors.push('No valid trades found in CSV file');
        console.log('❌ No valid trades parsed from CSV');
      }

    } catch (error) {
      result.errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }, [onTradesAdded]);

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('📁 File selected:', file?.name);
    
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.log('❌ Invalid file type');
      setUploadResult({
        success: false,
        tradesImported: 0,
        errors: ['Please select a CSV file'],
        warnings: []
      });
      setShowUploadModal(true);
      return;
    }

    console.log('✅ Valid CSV file, starting parse...');
    setIsUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      console.log('📄 File content length:', text.length, 'characters');
      console.log('📄 First 200 chars:', text.substring(0, 200));
      
      const result = parseCSV(text);
      console.log('📊 Parse result:', result);
      
      setUploadResult(result);
      setShowUploadModal(true);
    } catch (error) {
      console.error('💥 File read error:', error);
      setUploadResult({
        success: false,
        tradesImported: 0,
        errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      });
      setShowUploadModal(true);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [parseCSV]);

  // Trigger file input click
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Close upload modal
  const closeUploadModal = useCallback(() => {
    setShowUploadModal(false);
    setUploadResult(null);
  }, []);

  // Calendar data calculation with weekly P&L
  const calendarData = useMemo((): MonthData[] | DayData[] => {
    if (selectedChartView === '1y') {
      // For yearly view, we need all 12 months of the current year
      const currentYear = new Date().getFullYear();
      const yearData: MonthData[] = [];

      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1);
        const monthEnd = new Date(currentYear, month + 1, 0);
        const daysInMonth = monthEnd.getDate();
        const firstDayOfWeek = monthStart.getDay();

        const monthCalendar: DayData[] = [];
        let monthlyPL = 0;
        let monthlyTrades = 0;

        for (let dayIndex = 0; dayIndex < 42; dayIndex++) {
          let currentDate: Date;
          let isCurrentMonth = false;

          if (dayIndex < firstDayOfWeek) {
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? currentYear - 1 : currentYear;
            const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
            const dayOfPrevMonth = prevMonthLastDay - (firstDayOfWeek - dayIndex - 1);
            currentDate = new Date(prevYear, prevMonth, dayOfPrevMonth);
          } else if (dayIndex - firstDayOfWeek + 1 <= daysInMonth) {
            const dayOfCurrentMonth = dayIndex - firstDayOfWeek + 1;
            currentDate = new Date(currentYear, month, dayOfCurrentMonth);
            isCurrentMonth = true;
          } else {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? currentYear + 1 : currentYear;
            const dayOfNextMonth = dayIndex - firstDayOfWeek - daysInMonth + 1;
            currentDate = new Date(nextYear, nextMonth, dayOfNextMonth);
          }

          const dayTrades = trades.filter(trade => {
            const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
            return isSameDay(tradeDate, currentDate);
          });

          const totalPL = getAdjustedPL(dayTrades.reduce((sum, trade) => sum + trade.realizedPL, 0), dayTrades.length);

          if (isCurrentMonth && dayTrades.length > 0) {
            monthlyPL += totalPL;
            monthlyTrades += dayTrades.length;
          }

          monthCalendar.push({
            date: currentDate,
            totalPL,
            tradeCount: dayTrades.length,
            hasData: dayTrades.length > 0,
            isCurrentMonth
          });
        }

        yearData.push({
          month: monthStart,
          monthName: format(monthStart, 'MMM'),
          days: monthCalendar,
          monthlyPL,
          monthlyTrades
        });
      }

      return yearData;
    } else if (selectedChartView === 'all') {
      const allTimeData: MonthData[] = [];

      if (trades.length === 0) return allTimeData;

      const startDate = startOfMonth(tradeDataRange.earliest);
      const endDate = endOfMonth(tradeDataRange.latest);

      let currentDate = startDate;

      while (currentDate <= endDate) {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const daysInMonth = monthEnd.getDate();
        const firstDayOfWeek = monthStart.getDay();

        const monthCalendar: DayData[] = [];
        let monthlyPL = 0;
        let monthlyTrades = 0;

        for (let dayIndex = 0; dayIndex < 42; dayIndex++) {
          let dayDate: Date;
          let isCurrentMonth = false;

          if (dayIndex < firstDayOfWeek) {
            const prevMonth = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;
            const prevYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
            const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
            const dayOfPrevMonth = prevMonthLastDay - (firstDayOfWeek - dayIndex - 1);
            dayDate = new Date(prevYear, prevMonth, dayOfPrevMonth);
          } else if (dayIndex - firstDayOfWeek + 1 <= daysInMonth) {
            const dayOfCurrentMonth = dayIndex - firstDayOfWeek + 1;
            dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfCurrentMonth);
            isCurrentMonth = true;
          } else {
            const nextMonth = currentDate.getMonth() === 11 ? 0 : currentDate.getMonth() + 1;
            const nextYear = currentDate.getMonth() === 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
            const dayOfNextMonth = dayIndex - firstDayOfWeek - daysInMonth + 1;
            dayDate = new Date(nextYear, nextMonth, dayOfNextMonth);
          }

          const dayTrades = trades.filter(trade => {
            const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
            return isSameDay(tradeDate, dayDate);
          });

          const totalPL = getAdjustedPL(dayTrades.reduce((sum, trade) => sum + trade.realizedPL, 0), dayTrades.length);

          if (isCurrentMonth && dayTrades.length > 0) {
            monthlyPL += totalPL;
            monthlyTrades += dayTrades.length;
          }

          monthCalendar.push({
            date: dayDate,
            totalPL,
            tradeCount: dayTrades.length,
            hasData: dayTrades.length > 0,
            isCurrentMonth
          });
        }

        allTimeData.push({
          month: currentDate,
          monthName: format(currentDate, 'MMM yyyy'),
          days: monthCalendar,
          monthlyPL,
          monthlyTrades
        });

        currentDate = addMonths(currentDate, 1);
      }

      return allTimeData;
    } else {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

      const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

      return days.map(day => {
        const dayTrades = trades.filter(trade => {
          const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
          return isSameDay(tradeDate, day);
        });

        const totalPL = getAdjustedPL(dayTrades.reduce((sum, trade) => sum + trade.realizedPL, 0), dayTrades.length);

        return {
          date: day,
          totalPL,
          tradeCount: dayTrades.length,
          hasData: dayTrades.length > 0,
          isCurrentMonth: isSameMonth(day, currentMonth)
        };
      });
    }
  }, [trades, currentMonth, selectedChartView, tradeDataRange, applyCommission, commissionAmount, getAdjustedPL]);

  // Calculate weekly P&L data
  const weeklyData = useMemo((): WeekData[] => {
    if (selectedChartView === '1y' || selectedChartView === 'all' || !Array.isArray(calendarData)) return [];

    const dailyData = calendarData as DayData[];
    const weeks: WeekData[] = [];

    for (let i = 0; i < dailyData.length; i += 7) {
      const weekDays = dailyData.slice(i, i + 7);

      const weekTotalPL = weekDays.reduce((sum, day) => sum + day.totalPL, 0);
      const weekTotalTrades = weekDays.reduce((sum, day) => sum + day.tradeCount, 0);
      const weekHasData = weekDays.some(day => day.hasData);

      const weekStart = startOfWeek(weekDays[0].date, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(weekDays[0].date, { weekStartsOn: 0 });

      weeks.push({
        weekStart,
        weekEnd,
        totalPL: weekTotalPL,
        tradeCount: weekTotalTrades,
        hasData: weekHasData,
        days: weekDays
      });
    }

    return weeks;
  }, [calendarData, selectedChartView]);

  // Format compact P&L
  const formatCompactPL = (amount: number, isMobile: boolean = false): string => {
    if (Math.abs(amount) >= 100000) {
      return `${amount > 0 ? '+' : ''}${(amount / 1000).toFixed(0)}k`;
    } else if (Math.abs(amount) >= 10000) {
      return `${amount > 0 ? '+' : ''}${(amount / 1000).toFixed(1)}k`;
    } else if (Math.abs(amount) >= 1000) {
      return `${amount > 0 ? '+' : ''}${(amount / 1000).toFixed(1)}k`;
    }

    if (isMobile && Math.abs(amount) >= 100) {
      return `${amount > 0 ? '+' : ''}${Math.round(amount)}`;
    }

    return `${amount > 0 ? '+' : ''}${Math.round(amount)}`;
  };

  // Handle preset range selection
  const handlePresetRange = useCallback((preset: typeof RANGE_PRESETS[0]) => {
    if (preset.value === 'custom') {
      setShowCustomRange(true);
      setShowRangeDropdown(false);
      setSelectedRange(preset.label);
      return;
    }

    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (preset.value) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'thisMonth':
        startDate = startOfMonth(today);
        endDate = today;
        break;
      case 'thisYear':
        startDate = startOfYear(today);
        endDate = today;
        break;
      default:
        if (preset.days !== null && preset.days > 0) {
          startDate = subDays(today, preset.days - 1);
        } else {
          startDate = today;
        }
    }

    setFirstDate(startDate);
    setSecondDate(preset.value === 'today' ? null : endDate);
    onDateSelect(endDate);
    setShowRangeDropdown(false);
    setSelectedRange(preset.label);
    setShowCustomRange(false);
  }, [onDateSelect]);

  // Handle chart view change
  const handleChartViewChange = useCallback((view: typeof CHART_VIEWS[0]) => {
    setSelectedChartView(view.value);
    setShowChartDropdown(false);
    if (onChartViewChange) {
      onChartViewChange(view.value);
    }
  }, [onChartViewChange]);

  // Handle day click
  const handleDayClick = useCallback((date: Date) => {
    onDateSelect(date);
  }, [onDateSelect]);

  // Handle double click
  const handleDoubleClick = useCallback((date: Date) => {
    if (onDateDoubleClick) {
      onDateDoubleClick(date);
    }
  }, [onDateDoubleClick]);

  // Check if date is in selected range
  const isInSelectedRange = useCallback((date: Date): boolean => {
    if (!firstDate) return false;
    if (!secondDate) return isSameDay(date, firstDate);

    return isWithinInterval(date, {
      start: startOfDay(firstDate),
      end: endOfDay(secondDate)
    });
  }, [firstDate, secondDate]);

  // Get styling for each day
  const getDayClasses = useCallback((day: DayData): string => {
    const inRange = isInSelectedRange(day.date);
    const isTodayDate = isToday(day.date);
    const isSelectedDay = isSameDay(day.date, selectedDate);

    let classes = 'relative h-14 sm:h-16 md:h-20 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all duration-300 ';

    if (isSelectedDay) {
      classes += 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ';
    }

    if (inRange && (firstDate || secondDate)) {
      if (firstDate && isSameDay(day.date, firstDate)) {
        classes += 'bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg ';
      } else if (secondDate && isSameDay(day.date, secondDate)) {
        classes += 'bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg ';
      } else {
        classes += 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-900 dark:text-amber-100 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-800/30 dark:hover:to-orange-800/30 border-amber-200 dark:border-amber-800 ';
      }
    }
    else if (isTodayDate) {
      if (day.hasData && day.isCurrentMonth) {
        if (day.totalPL > 0) {
          classes += 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-800/30 dark:hover:to-teal-800/30 ';
        } else {
          classes += 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 hover:from-rose-100 hover:to-red-100 dark:hover:from-rose-800/30 dark:hover:to-red-800/30 ';
        }
      } else {
        classes += 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ';
      }
    }
    else if (day.hasData && day.isCurrentMonth) {
      if (day.totalPL > 0) {
        classes += 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-800/30 dark:hover:to-teal-800/30 border-emerald-200 dark:border-emerald-800 ';
      } else {
        classes += 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 hover:from-rose-100 hover:to-red-100 dark:hover:from-rose-800/30 dark:hover:to-red-800/30 border-rose-200 dark:border-rose-800 ';
      }
    }
    else if (day.isCurrentMonth) {
      classes += 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ';
    }
    else {
      classes += 'bg-slate-50 dark:bg-slate-900 opacity-50 ';
    }

    return classes;
  }, [selectedDate, isInSelectedRange, firstDate, secondDate]);

  // Get text color for content
  const getTextColor = useCallback((day: DayData): string => {
    const isFirstDate = firstDate && isSameDay(day.date, firstDate);
    const isSecondDate = secondDate && isSameDay(day.date, secondDate);
    const inRange = isInSelectedRange(day.date);

    if (isFirstDate || isSecondDate) {
      return 'text-white';
    }

    if (inRange && (firstDate || secondDate)) {
      return 'text-amber-900 dark:text-amber-100';
    }

    if (!day.isCurrentMonth) {
      return 'text-slate-400 dark:text-slate-500';
    }

    if (day.hasData) {
      if (day.totalPL > 0) {
        return 'text-emerald-800 dark:text-emerald-200';
      } else {
        return 'text-rose-800 dark:text-rose-200';
      }
    }

    return 'text-slate-900 dark:text-slate-100';
  }, [firstDate, secondDate, isInSelectedRange]);

  // Calculate range statistics
  const rangeStats = useMemo(() => {
    if (!firstDate) return null;

    const startDate = firstDate;
    const endDate = secondDate || firstDate;

    const rangeTrades = trades.filter(trade => {
      const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
      return isWithinInterval(tradeDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate)
      });
    });

    const totalPLBeforeCommission = rangeTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const totalPL = getAdjustedPL(totalPLBeforeCommission, rangeTrades.length);
    const wins = rangeTrades.filter(trade => getAdjustedPL(trade.realizedPL, 1) > 0).length;
    const losses = rangeTrades.filter(trade => getAdjustedPL(trade.realizedPL, 1) < 0).length;
    const dayCount = secondDate ? differenceInDays(endDate, startDate) + 1 : 1;

    const avgPerDay = dayCount > 0 ? totalPL / dayCount : 0;

    return {
      totalPL,
      tradeCount: rangeTrades.length,
      winCount: wins,
      lossCount: losses,
      dayCount,
      avgPerDay,
      winRate: rangeTrades.length > 0 ? (wins / rangeTrades.length) * 100 : 0
    };
  }, [firstDate, secondDate, trades, getAdjustedPL]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg">
            <CalendarIcon className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Trading Calendar
          </h3>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
          {/* CSV Upload Button */}
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            title="Upload CSV file"
          >
            <Upload className={`h-4 w-4 mr-2 ${isUploading ? 'animate-bounce' : ''}`} />
            <span className="text-sm font-medium hidden sm:inline">
              {isUploading ? 'Uploading...' : 'Upload CSV'}
            </span>
            <span className="text-sm font-medium sm:hidden">CSV</span>
          </button>

          {/* Date Range Display with Clear */}
          {(firstDate || secondDate) && (
            <div className="flex items-center space-x-2">
              {firstDate && secondDate ? (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Clock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    {format(firstDate, 'MMM d')} - {format(secondDate, 'MMM d')}
                  </span>
                </div>
              ) : firstDate ? (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Clock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    {format(firstDate, 'MMM d')}
                  </span>
                </div>
              ) : null}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="p-2 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded-lg transition-all duration-200 hover:scale-105"
                title="Clear selection"
              >
                <span className="text-lg font-bold">×</span>
              </button>
            </div>
          )}

          {/* Month Navigation - Only show for monthly view */}
          {selectedChartView === '1m' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onMonthChange(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:scale-105"
                title="Previous month"
              >
                <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>

              <h4 className="text-lg font-semibold text-slate-900 dark:text-white min-w-[120px] sm:min-w-[140px] text-center">
                {format(currentMonth, 'MMM yyyy')}
              </h4>

              <button
                onClick={() => onMonthChange(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:scale-105"
                title="Next month"
              >
                <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Controls */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analysis Controls
            </h4>

            {/* Commission Toggle */}
            <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-600">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setApplyCommission(!applyCommission)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                    applyCommission
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                  }`}
                  title={applyCommission ? 'Commission enabled' : 'Commission disabled'}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                      applyCommission ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Commission
                </span>
              </div>

              {applyCommission && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Per Trade:</span>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={commissionAmount}
                      onChange={(e) => setCommissionAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-16 pl-6 pr-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {applyCommission && commissionAmount > 0 && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200">
                <span className="font-semibold">${commissionAmount.toFixed(2)}</span> commission per trade will be deducted from P&L calculations
              </p>
            </div>
          )}

          {/* Dropdown Controls Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Range Selection Dropdown */}
            <div className="relative flex-1" ref={rangeDropdownRef}>
              <button
                onClick={() => {
                  setShowRangeDropdown(!showRangeDropdown);
                  setShowChartDropdown(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
              >
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {selectedRange || 'Select Analysis Range'}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${showRangeDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showRangeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {RANGE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handlePresetRange(preset)}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chart View Dropdown */}
            <div className="relative flex-1" ref={chartDropdownRef}>
              <button
                onClick={() => {
                  setShowChartDropdown(!showChartDropdown);
                  setShowRangeDropdown(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
              >
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Chart View: {CHART_VIEWS.find(v => v.value === selectedChartView)?.label || '1 Month'}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${showChartDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showChartDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10">
                  {CHART_VIEWS.map((view) => (
                    <button
                      key={view.value}
                      onClick={() => handleChartViewChange(view)}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg ${
                        selectedChartView === view.value
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {showCustomRange && (
            <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Custom Date Range
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={firstDate ? format(firstDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const newDate = new Date(e.target.value);
                        setFirstDate(newDate);
                        onDateSelect(newDate);
                        if (secondDate && isBefore(secondDate, newDate)) {
                          setSecondDate(null);
                        }
                      } else {
                        setFirstDate(null);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={secondDate ? format(secondDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const newDate = new Date(e.target.value);
                        if (firstDate) {
                          if (isBefore(newDate, firstDate)) {
                            setSecondDate(firstDate);
                            setFirstDate(newDate);
                            onDateSelect(newDate);
                          } else {
                            setSecondDate(newDate);
                          }
                        } else {
                          setFirstDate(newDate);
                          onDateSelect(newDate);
                        }
                      } else {
                        setSecondDate(null);
                      }
                    }}
                    min={firstDate ? format(firstDate, 'yyyy-MM-dd') : undefined}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm transition-all duration-200"
                  />
                </div>

                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                      setShowCustomRange(false);
                    }}
                    disabled={!firstDate && !secondDate}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {firstDate && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {!secondDate ? (
                      <>Selected: <span className="font-medium text-amber-600 dark:text-amber-400">{format(firstDate, 'MMM d, yyyy')}</span> (single day)</>
                    ) : (
                      <>Range: <span className="font-medium text-amber-600 dark:text-amber-400">{format(firstDate, 'MMM d, yyyy')} - {format(secondDate, 'MMM d, yyyy')}</span> ({differenceInDays(secondDate, firstDate) + 1} days)</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload CSV files or use dropdowns for analysis • Click any date to view daily details • Double-click for detailed view
        </p>
      </div>

      {/* Calendar Grid - (keeping existing calendar rendering code) */}
      {/* ... Rest of the calendar rendering code remains the same ... */}
      {selectedChartView === '1y' || selectedChartView === 'all' ? (
        <div className="space-y-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {selectedChartView === '1y'
                ? `${new Date().getFullYear()} Trading Calendar`
                : `YTD Trading Calendar (${format(tradeDataRange.earliest, 'yyyy')} - ${format(tradeDataRange.latest, 'yyyy')})`
              }
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(calendarData as MonthData[]).map((monthData: MonthData) => {
              const weeks = [];
              for (let i = 0; i < monthData.days.length; i += 7) {
                weeks.push(monthData.days.slice(i, i + 7));
              }

              return (
                <div key={monthData.monthName} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <div className="text-center mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {monthData.monthName}
                    </h4>
                    {monthData.monthlyTrades > 0 && (
                      <div className="mt-1">
                        <div className={`text-xs font-bold ${
                          monthData.monthlyPL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatCurrency(monthData.monthlyPL)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {monthData.monthlyTrades} trades
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={i} className="w-5 h-4 text-xs text-slate-500 dark:text-slate-400 text-center font-medium flex items-center justify-center">
                        {day}
                      </div>
                    ))}
                  </div>

                  {weeks.map((week: DayData[], weekIndex: number) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                      {week.map((day: DayData, dayIndex: number) => {
                        const isTodayDate = isToday(day.date);
                        const isCurrentMonthDay = day.isCurrentMonth;

                        let colorClass = 'bg-slate-200 dark:bg-slate-700';

                        if (isCurrentMonthDay && day.hasData) {
                          if (day.totalPL > 0) {
                            colorClass = 'bg-green-500';
                          } else if (day.totalPL < 0) {
                            colorClass = 'bg-red-500';
                          } else {
                            colorClass = 'bg-gray-400';
                          }
                        } else if (!isCurrentMonthDay) {
                          colorClass = 'bg-slate-100 dark:bg-slate-800';
                        }

                        return (
                          <div
                            key={dayIndex}
                            className={`w-5 h-5 rounded-sm ${colorClass} ${
                              isTodayDate ? 'ring-2 ring-blue-400' : ''
                            } ${!isCurrentMonthDay ? 'opacity-30' : ''} hover:scale-110 transition-all duration-150 cursor-pointer flex items-center justify-center`}
                            onClick={() => handleDayClick(day.date)}
                            title={
                              isCurrentMonthDay && day.hasData
                                ? `${format(day.date, 'MMM d')}: ${formatCurrency(day.totalPL)} (${day.tradeCount} trades)`
                                : format(day.date, 'MMM d')
                            }
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-xs sm:text-sm">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-sm"></div>
              <span className="text-slate-600 dark:text-slate-400">Profit</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-sm"></div>
              <span className="text-slate-600 dark:text-slate-400">Loss</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-400 rounded-sm"></div>
              <span className="text-slate-600 dark:text-slate-400">Breakeven</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-slate-200 dark:bg-slate-700 rounded-sm border border-slate-300 dark:border-slate-600"></div>
              <span className="text-slate-600 dark:text-slate-400">No Trades</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-slate-400 rounded-sm ring-2 ring-blue-400"></div>
              <span className="text-slate-600 dark:text-slate-400">Today</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1 sm:space-y-2">
          <div className="grid grid-cols-8 gap-1 sm:gap-2">
            {(typeof window !== 'undefined' && window.innerWidth < 640 ? DAY_NAMES_MOBILE : DAY_NAMES).map((day, index) => (
              <div key={index} className="h-8 flex items-center justify-center">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {day}
                </span>
              </div>
            ))}
            <div className="h-8 flex items-center justify-center">
              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                Week P&L
              </span>
            </div>
          </div>

          {weeklyData.map((week: WeekData, weekIndex: number) => (
            <div key={weekIndex} className="grid grid-cols-8 gap-1 sm:gap-2">
              {week.days.map((day: DayData, dayIndex: number) => (
                <div
                  key={dayIndex}
                  className={`${getDayClasses(day)} calendar-day`}
                  onClick={() => handleDayClick(day.date)}
                  onDoubleClick={() => handleDoubleClick(day.date)}
                  title={day.hasData ? `${formatCurrency(day.totalPL)} (${day.tradeCount} trades)` : format(day.date, 'MMM d')}
                >
                  <div className="absolute top-1 sm:top-2 left-1 sm:left-2">
                    <span className={`text-xs sm:text-sm font-semibold ${getTextColor(day)}`}>
                      {format(day.date, 'd')}
                    </span>
                  </div>

                  {firstDate && isSameDay(day.date, firstDate) && (
                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">1</span>
                      </div>
                    </div>
                  )}
                  {secondDate && isSameDay(day.date, secondDate) && (
                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">2</span>
                      </div>
                    </div>
                  )}

                  {isToday(day.date) && !isInSelectedRange(day.date) && (
                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full shadow-sm"></div>
                    </div>
                  )}

                  {day.hasData && day.isCurrentMonth && (
                    <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 right-1 sm:right-2">
                      <div className={`text-xs font-semibold truncate ${getTextColor(day)}`}>
                        {formatCompactPL(day.totalPL, typeof window !== 'undefined' && window.innerWidth < 640)}
                      </div>
                      <div className={`text-xs truncate opacity-75 ${getTextColor(day)} hidden sm:block`}>
                        {day.tradeCount} trade{day.tradeCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div
                className={`relative h-14 sm:h-16 md:h-20 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center ${
                  week.hasData
                    ? week.totalPL >= 0
                      ? 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 border-emerald-300 dark:border-emerald-700'
                      : 'bg-gradient-to-br from-rose-100 to-red-100 dark:from-rose-900/30 dark:to-red-900/30 border-rose-300 dark:border-rose-700'
                    : 'bg-slate-50 dark:bg-slate-900'
                }`}
                title={week.hasData ? `Week of ${format(week.weekStart, 'MMM d')}: ${formatCurrency(week.totalPL)} (${week.tradeCount} trades)` : `Week of ${format(week.weekStart, 'MMM d')}: No trades`}
              >
                {week.hasData && (
                  <>
                    <div
                      className={`text-xs sm:text-sm font-bold ${
                        week.totalPL >= 0
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {formatCompactPL(week.totalPL, typeof window !== 'undefined' && window.innerWidth < 640)}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 hidden sm:block">
                      {week.tradeCount} trade{week.tradeCount !== 1 ? 's' : ''}
                    </div>
                  </>
                )}
                {!week.hasData && (
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    No trades
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 mt-6 text-xs sm:text-sm">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded border border-emerald-200 dark:border-emerald-800"></div>
          <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap">Profitable</span>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 rounded border border-rose-200 dark:border-rose-800"></div>
          <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap">Loss Days</span>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded border border-amber-200"></div>
          <span className="text-slate-600 dark:text-slate-400">Selected</span>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full"></div>
          <span className="text-slate-600 dark:text-slate-400">Today</span>
        </div>
      </div>

      {/* Range Analysis */}
      {rangeStats && (
        <div className="mt-6">
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 rounded-xl p-4 sm:p-6 border border-amber-200 dark:border-amber-800 shadow-lg">
            <div className="text-center mb-4 sm:mb-6">
              <h4 className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                {secondDate ? 'Range Analysis' : 'Day Analysis'}
              </h4>
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-2">
                {firstDate && format(firstDate, 'MMM d, yyyy')}
                {secondDate && ` - ${format(secondDate, 'MMM d, yyyy')}`}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {secondDate && (
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {rangeStats.dayCount}
                  </div>
                  <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium">
                    Day{rangeStats.dayCount !== 1 ? 's' : ''}
                  </div>
                </div>
              )}

              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div
                  className={`text-xl sm:text-2xl font-bold ${
                    rangeStats.totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(rangeStats.totalPL)}
                </div>
                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Total P&L
                </div>
              </div>

              {secondDate && (
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                  <div
                    className={`text-xl sm:text-2xl font-bold ${
                      rangeStats.avgPerDay >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(rangeStats.avgPerDay)}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Avg/Day
                  </div>
                </div>
              )}

              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {rangeStats.tradeCount}
                </div>
                <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium">
                  Trade{rangeStats.tradeCount !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div
                  className={`text-xl sm:text-2xl font-bold ${
                    rangeStats.winRate >= 50 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {rangeStats.winRate.toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Win Rate
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                  {rangeStats.winCount}
                </div>
                <div className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  Win{rangeStats.winCount !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div className="text-xl sm:text-2xl font-bold text-rose-600">
                  {rangeStats.lossCount}
                </div>
                <div className="text-xs sm:text-sm text-rose-700 dark:text-rose-400 font-medium">
                  Loss{rangeStats.lossCount !== 1 ? 'es' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Result Modal */}
      {showUploadModal && uploadResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={`p-6 border-b ${
              uploadResult.success
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {uploadResult.success ? (
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-rose-600" />
                  )}
                  <div>
                    <h3 className={`text-xl font-bold ${
                      uploadResult.success
                        ? 'text-emerald-900 dark:text-emerald-100'
                        : 'text-rose-900 dark:text-rose-100'
                    }`}>
                      {uploadResult.success ? 'Import Successful!' : 'Import Failed'}
                    </h3>
                    <p className={`text-sm ${
                      uploadResult.success
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}>
                      {uploadResult.success
                        ? `${uploadResult.tradesImported} trade${uploadResult.tradesImported !== 1 ? 's' : ''} imported`
                        : 'Please check the errors below'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeUploadModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Errors */}
              {uploadResult.errors.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
                  <h4 className="font-semibold text-rose-900 dark:text-rose-100 mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Errors ({uploadResult.errors.length})
                  </h4>
                  <ul className="space-y-1 text-sm text-rose-800 dark:text-rose-200">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {uploadResult.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Warnings ({uploadResult.warnings.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                      {uploadResult.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* CSV Format Guide */}
              {!uploadResult.success && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Expected CSV Format
                  </h4>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                    <p className="font-medium">Required columns (in any order):</p>
                    <ul className="space-y-1 ml-4">
                      <li>• <strong>Time/Date/Timestamp</strong> - Trade date and time</li>
                      <li>• <strong>Ticker/Symbol</strong> - Stock symbol</li>
                      <li>• <strong>Direction/Side</strong> - Long/Short or Buy/Sell</li>
                      <li>• <strong>Quantity</strong> - Number of shares</li>
                      <li>• <strong>Entry Price</strong> - Buy price</li>
                      <li>• <strong>Exit Price</strong> - Sell price</li>
                      <li>• <strong>Realized P&L</strong> - Profit or loss amount</li>
                      <li>• <strong>Notes</strong> (optional) - Trade notes</li>
                    </ul>
                    <p className="mt-2 text-xs">
                      Column names can vary - the system will attempt to match them automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={closeUploadModal}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
              {uploadResult.success && (
                <button
                  onClick={() => {
                    closeUploadModal();
                    handleUploadClick();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Another File
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};