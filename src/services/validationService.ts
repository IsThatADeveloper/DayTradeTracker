// src/services/validationService.ts - UPDATED: Increased price limits to $1,000,000
// FIXED: Changed timestamp validation to allow historical trades (1990+)
import DOMPurify from 'dompurify';
import { Trade } from '../types/trade';

class ValidationService {
  // Rate limiting storage
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });
  }

  validateTicker(ticker: string): { isValid: boolean; sanitized: string; errors: string[] } {
    const errors: string[] = [];
    let sanitized = ticker.toUpperCase().trim();

    // Remove any non-alphanumeric characters except dots
    sanitized = sanitized.replace(/[^A-Z0-9.]/g, '');

    if (sanitized.length === 0) {
      errors.push('Ticker symbol is required');
    } else if (sanitized.length > 10) {
      errors.push('Ticker symbol must be 10 characters or less');
    } else if (!/^[A-Z][A-Z0-9.]*$/.test(sanitized)) {
      errors.push('Ticker symbol must start with a letter');
    }

    return { isValid: errors.length === 0, sanitized, errors };
  }

  validateTrade(trade: Partial<Trade>): { isValid: boolean; sanitized: Partial<Trade>; errors: string[] } {
    const errors: string[] = [];
    const sanitized: Partial<Trade> = {};

    // Validate ticker
    if (trade.ticker) {
      const tickerValidation = this.validateTicker(trade.ticker);
      if (!tickerValidation.isValid) {
        errors.push(...tickerValidation.errors);
      } else {
        sanitized.ticker = tickerValidation.sanitized;
      }
    } else {
      errors.push('Ticker is required');
    }

    // UPDATED: Validate prices without rounding - preserve full precision
    // INCREASED LIMIT: Now supports prices up to $1,000,000 (was $100,000)
    if (typeof trade.entryPrice === 'number') {
      if (trade.entryPrice <= 0 || trade.entryPrice > 1000000) {
        errors.push('Entry price must be between $0.000001 and $1,000,000');
      } else {
        // REMOVED: Math.round(trade.entryPrice * 100) / 100
        // Now preserves full precision up to JavaScript's number limits
        sanitized.entryPrice = trade.entryPrice;
      }
    } else {
      errors.push('Valid entry price is required');
    }

    // FIXED: Allow exit price of 0 for open positions
    if (typeof trade.exitPrice === 'number') {
      // Check if this is an open position (status === 'open' or exitPrice === 0)
      const isOpenPosition = trade.status === 'open' || trade.exitPrice === 0;
      
      if (isOpenPosition) {
        // For open positions, exit price should be 0 or very close to 0
        if (trade.exitPrice < 0 || trade.exitPrice > 1000000) {
          errors.push('Exit price must be between $0 and $1,000,000');
        } else {
          sanitized.exitPrice = trade.exitPrice;
          // Ensure status is set to 'open' if exit price is 0
          if (trade.exitPrice === 0 && !trade.status) {
            sanitized.status = 'open';
          }
        }
      } else {
        // For closed positions, exit price must be greater than 0
        if (trade.exitPrice <= 0 || trade.exitPrice > 1000000) {
          errors.push('Exit price must be between $0.000001 and $1,000,000');
        } else {
          sanitized.exitPrice = trade.exitPrice;
        }
      }
    } else {
      errors.push('Valid exit price is required');
    }

    // Break-even trades are now allowed - no equality check needed

    // Validate quantity
    if (typeof trade.quantity === 'number') {
      if (trade.quantity <= 0 || trade.quantity > 1000000 || !Number.isInteger(trade.quantity)) {
        errors.push('Quantity must be a positive integer up to 1,000,000');
      } else {
        sanitized.quantity = trade.quantity;
      }
    } else {
      errors.push('Valid quantity is required');
    }

    // Validate direction
    if (trade.direction && ['long', 'short'].includes(trade.direction)) {
      sanitized.direction = trade.direction;
    } else {
      errors.push('Direction must be either "long" or "short"');
    }

    // Validate status field
    if (trade.status) {
      if (['open', 'closed'].includes(trade.status)) {
        sanitized.status = trade.status;
      } else {
        errors.push('Status must be either "open" or "closed"');
      }
    } else {
      // Auto-detect status based on exit price if not provided
      if (trade.exitPrice === 0) {
        sanitized.status = 'open';
      } else {
        sanitized.status = 'closed';
      }
    }

    // Validate and sanitize notes
    if (trade.notes) {
      const sanitizedNotes = this.sanitizeHtml(trade.notes);
      if (sanitizedNotes.length > 1000) {
        errors.push('Notes must be 1000 characters or less');
      } else {
        sanitized.notes = sanitizedNotes;
      }
    }

    // ✅ FIXED: Validate timestamp - Allow historical trades from 1990 onwards
    if (trade.timestamp && trade.timestamp instanceof Date) {
      const now = new Date();
      const minValidDate = new Date('1990-01-01'); // Changed from 1 year ago to 1990
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      if (trade.timestamp < minValidDate || trade.timestamp > oneDayFromNow) {
        errors.push('Trade timestamp must be after 1990 and not in the future');
      } else {
        sanitized.timestamp = trade.timestamp;
      }
    } else if (trade.timestamp) {
      errors.push('Valid timestamp is required');
    }

    return { isValid: errors.length === 0, sanitized, errors };
  }

  checkRateLimit(userId: string, action: string, maxRequests: number = 50, windowMs: number = 60000): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const window = this.rateLimitMap.get(key);

    if (!window || now > window.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (window.count >= maxRequests) {
      return false;
    }

    window.count++;
    return true;
  }

  // Clean up old rate limit entries
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, window] of this.rateLimitMap.entries()) {
      if (now > window.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}

export const validationService = new ValidationService();

// Cleanup rate limits every 5 minutes
setInterval(() => {
  validationService.cleanupRateLimits();
}, 5 * 60 * 1000);