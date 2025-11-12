// src/services/userPreferencesService.ts
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export interface NavigationPreference {
  id: string;
  label: string;
  icon: string;
  description: string;
  visible: boolean;
  order: number;
}

export interface UserPreferences {
  userId: string;
  navigation: NavigationPreference[];
  updatedAt: Date;
}

class UserPreferencesService {
  private readonly COLLECTION_NAME = 'user_preferences';

  /**
   * Get user preferences from Firestore
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          userId: data.userId,
          navigation: data.navigation || [],
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error(`Failed to get user preferences: ${error}`);
    }
  }

  /**
   * Save user preferences to Firestore
   */
  async saveUserPreferences(
    userId: string,
    navigation: NavigationPreference[]
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const preferences: UserPreferences = {
        userId,
        navigation,
        updatedAt: new Date()
      };

      await setDoc(docRef, preferences, { merge: true });
      console.log('✅ User preferences saved successfully');
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw new Error(`Failed to save user preferences: ${error}`);
    }
  }

  /**
   * Delete user preferences (reset to default)
   */
  async deleteUserPreferences(userId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      await deleteDoc(docRef);
      console.log('✅ User preferences deleted successfully');
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      throw new Error(`Failed to delete user preferences: ${error}`);
    }
  }

  /**
   * Check if user has custom preferences
   */
  async hasCustomPreferences(userId: string): Promise<boolean> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error checking user preferences:', error);
      return false;
    }
  }
}

export const userPreferencesService = new UserPreferencesService();