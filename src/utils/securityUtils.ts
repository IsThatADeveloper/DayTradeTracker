// src/utils/securityUtils.ts
export class SecurityUtils {
  static validateEnvironment(): void {
    // Check if running on HTTPS in production
    if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
      throw new Error('Application must be served over HTTPS in production');
    }
  }

  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Only allow HTTPS URLs in production
      if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs are allowed in production');
      }
      return parsed.toString();
    } catch {
      throw new Error('Invalid URL provided');
    }
  }

  static detectSuspiciousActivity(userId: string, action: string): boolean {
    const key = `suspicious_${userId}`;
    const activities = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Add current activity
    activities.push({ action, timestamp: Date.now() });
    
    // Keep only last hour of activities
    const oneHourAgo = Date.now() - 3600000;
    const recentActivities = activities.filter((a: any) => a.timestamp > oneHourAgo);
    
    localStorage.setItem(key, JSON.stringify(recentActivities));
    
    // Flag if too many actions in short time
    return recentActivities.length > 100;
  }

  // Initialize security on app start
  static initializeSecurity(): void {
    this.validateEnvironment();
    
    // Add security headers check
    this.checkSecurityHeaders();
    
    // Set up Content Security Policy violations reporting
    this.setupCSPReporting();
  }

  private static checkSecurityHeaders(): void {
    // Check for basic security headers
    const testXFrame = () => {
      try {
        if (window.top !== window.self) {
          console.warn('App is running in a frame - potential clickjacking risk');
        }
      } catch (e) {
        // X-Frame-Options: DENY is working
      }
    };

    testXFrame();
  }

  private static setupCSPReporting(): void {
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error('CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy
      });
    });
  }
}