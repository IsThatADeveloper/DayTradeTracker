// src/services/auditService.ts
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuditEvent {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class AuditService {
  async logEvent(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
    try {
      const auditEvent: AuditEvent = {
        ...event,
        timestamp: new Date()
      };

      await addDoc(collection(db, 'audit_logs'), {
        ...auditEvent,
        timestamp: Timestamp.fromDate(auditEvent.timestamp)
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break app functionality
    }
  }

  async logSecurityEvent(
    userId: string, 
    action: string, 
    details: any, 
    severity: AuditEvent['severity'] = 'medium'
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resourceType: 'security',
      metadata: details,
      severity
    });
  }

  async logDataAccess(userId: string, resourceType: string, resourceId: string): Promise<void> {
    await this.logEvent({
      userId,
      action: 'data_access',
      resourceType,
      resourceId,
      severity: 'low'
    });
  }

  async logDataModification(
    userId: string, 
    action: 'create' | 'update' | 'delete', 
    resourceType: string, 
    resourceId: string,
    changes?: any
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: `data_${action}`,
      resourceType,
      resourceId,
      metadata: { changes },
      severity: action === 'delete' ? 'high' : 'medium'
    });
  }
}

export const auditService = new AuditService();