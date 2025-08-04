import React, { useState } from 'react';
import { LogIn, LogOut, User, Shield, Cloud, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthComponentProps {
  onOpenProfile?: () => void;
}

export const AuthComponent: React.FC<AuthComponentProps> = ({ onOpenProfile }) => {
  const { currentUser, signInWithGoogle, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Failed to sign in:', error);
      alert('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (currentUser) {
    return (
      <>
        {/* Desktop View */}
        <div className="hidden lg:flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-green-500 dark:text-green-400">
            <Cloud className="h-4 w-4" />
            <span className="hidden xl:inline">Synced</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {currentUser.photoURL && !imageError ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                className="w-8 h-8 rounded-full"
                onError={handleImageError}
              />
            ) : (
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </div>
            )}
            
            <div className="hidden xl:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {currentUser.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentUser.email}
              </p>
            </div>
          </div>

          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="h-4 w-4 mr-1" />
              <span className="hidden xl:inline">Profile</span>
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span className="hidden xl:inline">Sign Out</span>
          </button>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden w-full space-y-3">
          {/* Status and User Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-green-500 dark:text-green-400">
              <Cloud className="h-4 w-4" />
              <span>Cloud Synced</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {currentUser.photoURL && !imageError ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="w-6 h-6 rounded-full"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="h-3 w-3 text-gray-600 dark:text-gray-300" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {currentUser.displayName || 'User'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="flex items-center justify-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Profile
              </button>
            )}

            <button
              onClick={handleSignOut}
              className={`flex items-center justify-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                !onOpenProfile ? 'col-span-2' : ''
              }`}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop View */}
      <div className="hidden lg:flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-sm text-yellow-600 dark:text-yellow-400">
          <Shield className="h-4 w-4" />
          <span className="hidden xl:inline">Local Only</span>
        </div>
        
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <LogIn className="h-4 w-4 mr-2" />
          <span className="hidden xl:inline">{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
          <span className="xl:hidden">{isLoading ? 'Signing in...' : 'Sign in'}</span>
        </button>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden w-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-yellow-600 dark:text-yellow-400">
            <Shield className="h-4 w-4" />
            <span>Local Storage Only</span>
          </div>
        </div>
        
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <LogIn className="h-4 w-4 mr-2" />
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </>
  );
};