// src/services/validationService.ts
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

    // Validate prices
    if (typeof trade.entryPrice === 'number') {
      if (trade.entryPrice <= 0 || trade.entryPrice > 100000) {
        errors.push('Entry price must be between $0.01 and $100,000');
      } else {
        sanitized.entryPrice = Math.round(trade.entryPrice * 100) / 100;
      }
    } else {
      errors.push('Valid entry price is required');
    }

    if (typeof trade.exitPrice === 'number') {
      if (trade.exitPrice <= 0 || trade.exitPrice > 100000) {
        errors.push('Exit price must be between $0.01 and $100,000');
      } else {
        sanitized.exitPrice = Math.round(trade.exitPrice * 100) / 100;
      }
    } else {
      errors.push('Valid exit price is required');
    }

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

    // Validate and sanitize notes
    if (trade.notes) {
      const sanitizedNotes = this.sanitizeHtml(trade.notes);
      if (sanitizedNotes.length > 1000) {
        errors.push('Notes must be 1000 characters or less');
      } else {
        sanitized.notes = sanitizedNotes;
      }
    }

    // Validate timestamp
    if (trade.timestamp && trade.timestamp instanceof Date) {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      if (trade.timestamp < oneYearAgo || trade.timestamp > oneDayFromNow) {
        errors.push('Trade timestamp must be within the last year and not in the future');
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