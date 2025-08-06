import React from 'react';
import { LogIn, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthComponentProps {
  onOpenProfile: () => void;
}

export const AuthComponent: React.FC<AuthComponentProps> = ({ onOpenProfile }) => {
  const { currentUser, signInWithGoogle } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Failed to sign in. Please try again.');
    }
  };

  if (!currentUser) {
    return (
      <button
        onClick={handleSignIn}
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <LogIn className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Sign In</span>
        <span className="sm:hidden">Sign In</span>
      </button>
    );
  }

  return (
    <button
      onClick={onOpenProfile}
      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
    >
      {currentUser.photoURL ? (
        <img
          src={currentUser.photoURL}
          alt="Profile"
          className="w-6 h-6 rounded-full"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <User className="h-4 w-4" />
      )}
      <span className="hidden sm:inline truncate max-w-32">
        {currentUser.displayName || currentUser.email?.split('@')[0] || 'Profile'}
      </span>
    </button>
  );
};
