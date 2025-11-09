// src/services/permanentNotesService.ts
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface PermanentNotes {
  id?: string;
  userId: string;
  tradingRules: string;
  strategiesAndSetups: string;
  riskManagement: string;
  journalGuidelines: string;
  resources: string;
  generalReminders: string;
  createdAt: Date;
  updatedAt: Date;
}

class PermanentNotesService {
  private collectionName = 'permanentNotes';

  /**
   * Get permanent notes for a user
   */
  async getPermanentNotes(userId: string): Promise<PermanentNotes | null> {
    try {
      console.log('📝 Getting permanent notes for user:', userId);
      const docRef = doc(db, this.collectionName, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log('✅ Permanent notes found in Firestore');
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          tradingRules: data.tradingRules || '',
          strategiesAndSetups: data.strategiesAndSetups || '',
          riskManagement: data.riskManagement || '',
          journalGuidelines: data.journalGuidelines || '',
          resources: data.resources || '',
          generalReminders: data.generalReminders || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }

      console.log('ℹ️ No permanent notes found - will create default');
      return null;
    } catch (error: any) {
      console.error('❌ Error getting permanent notes:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get permanent notes: ${error.message}`);
    }
  }

  /**
   * Create default permanent notes
   */
  createDefaultPermanentNotes(userId: string): PermanentNotes {
    return {
      userId,
      tradingRules: '',
      strategiesAndSetups: '',
      riskManagement: '',
      journalGuidelines: '',
      resources: '',
      generalReminders: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Save or update permanent notes
   */
  async savePermanentNotes(userId: string, notes: Partial<PermanentNotes>): Promise<void> {
    try {
      console.log('💾 Saving permanent notes for user:', userId);
      const docRef = doc(db, this.collectionName, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Update existing document
        console.log('🔄 Updating existing permanent notes');
        await updateDoc(docRef, {
          ...notes,
          updatedAt: serverTimestamp(),
        });
        console.log('✅ Permanent notes updated successfully');
      } else {
        // Create new document
        console.log('✨ Creating new permanent notes document');
        await setDoc(docRef, {
          userId,
          tradingRules: notes.tradingRules || '',
          strategiesAndSetups: notes.strategiesAndSetups || '',
          riskManagement: notes.riskManagement || '',
          journalGuidelines: notes.journalGuidelines || '',
          resources: notes.resources || '',
          generalReminders: notes.generalReminders || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log('✅ Permanent notes created successfully');
      }
    } catch (error: any) {
      console.error('❌ Error saving permanent notes:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to save permanent notes: ${error.message}`);
    }
  }
}

export const permanentNotesService = new PermanentNotesService();