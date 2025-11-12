// src/components/ChatRoom.tsx - Real-time Firebase Chat Room
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Users, Activity, Clock, AlertCircle } from 'lucide-react';
import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  doc,
  setDoc,
  Timestamp
} from 'firebase/firestore';

interface Message {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: any;
}

interface User {
  id: string;
  name: string;
  color: string;
  lastSeen: any;
  status: 'online' | 'away';
}

interface ChatRoomProps {
  currentUser?: { uid: string; displayName: string | null };
}

const USER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-yellow-500',
];

const getColorForUser = (userId: string): string => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
};

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const presenceIntervalRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up user presence
  useEffect(() => {
    if (!currentUser) return;

    const setupPresence = async () => {
      try {
        const userPresenceRef = doc(db, 'chatPresence', currentUser.uid);
        
        // Set user as online
        await setDoc(userPresenceRef, {
          id: currentUser.uid,
          name: currentUser.displayName || 'Anonymous Trader',
          color: getColorForUser(currentUser.uid),
          lastSeen: serverTimestamp(),
          status: 'online'
        }, { merge: true });

        // Update presence every 30 seconds
        presenceIntervalRef.current = setInterval(async () => {
          try {
            await updateDoc(userPresenceRef, {
              lastSeen: serverTimestamp(),
              status: 'online'
            });
          } catch (err) {
            console.error('Error updating presence:', err);
          }
        }, 30000);

        // Clean up on unmount
        return () => {
          if (presenceIntervalRef.current) {
            clearInterval(presenceIntervalRef.current);
          }
          updateDoc(userPresenceRef, {
            status: 'away',
            lastSeen: serverTimestamp()
          }).catch(console.error);
        };
      } catch (err) {
        console.error('Error setting up presence:', err);
      }
    };

    const cleanup = setupPresence();

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      cleanup?.then(fn => fn?.());
    };
  }, [currentUser]);

  // Listen to messages
  useEffect(() => {
    try {
      const messagesRef = collection(db, 'chatMessages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const msgs: Message[] = [];
          snapshot.forEach((doc) => {
            msgs.push({ id: doc.id, ...doc.data() } as Message);
          });
          setMessages(msgs.reverse());
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error loading messages:', err);
          setError('Failed to load messages. Please refresh.');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up messages listener:', err);
      setError('Failed to connect to chat.');
      setLoading(false);
    }
  }, []);

  // Listen to online users
  useEffect(() => {
    try {
      const presenceRef = collection(db, 'chatPresence');

      const unsubscribe = onSnapshot(presenceRef, 
        (snapshot) => {
          const users: User[] = [];
          const now = new Date().getTime();
          
          snapshot.forEach((doc) => {
            const userData = doc.data() as User;
            const lastSeen = userData.lastSeen?.toDate?.()?.getTime() || 0;
            const isRecent = now - lastSeen < 60000; // Active within last minute
            
            users.push({
              ...userData,
              status: isRecent ? 'online' : 'away'
            });
          });
          
          // Sort: online first, then by name
          users.sort((a, b) => {
            if (a.status === 'online' && b.status !== 'online') return -1;
            if (a.status !== 'online' && b.status === 'online') return 1;
            return a.name.localeCompare(b.name);
          });
          
          setActiveUsers(users);
        },
        (err) => {
          console.error('Error loading users:', err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up presence listener:', err);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;

    try {
      const messagesRef = collection(db, 'chatMessages');
      
      await addDoc(messagesRef, {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous Trader',
        userColor: getColorForUser(currentUser.uid),
        text: inputText.trim(),
        timestamp: serverTimestamp()
      });

      setInputText('');
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'online' ? 'bg-green-500' : 'bg-gray-400';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Sign In Required
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to access the trading chat room and connect with other traders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-md">
              <MessageSquare className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Trading Chat Room
              </h2>
              <p className="text-blue-100 mt-1 flex items-center text-sm">
                <Activity className="h-4 w-4 mr-1" />
                Connect with traders in real-time
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center text-white text-sm font-medium">
                <Users className="h-5 w-5 mr-2" />
                {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'}
              </div>
              <div className="text-blue-100 text-xs mt-1">
                {activeUsers.filter(u => u.status === 'online').length} online
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
            >
              Click to refresh
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Users Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-600" />
                Active Traders
              </h3>
            </div>

            {/* User List */}
            <div className="p-3 space-y-2 max-h-[550px] overflow-y-auto">
              {activeUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No users online</p>
                </div>
              ) : (
                activeUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-shrink-0 relative">
                      <div className={`h-10 w-10 rounded-full ${user.color} flex items-center justify-center text-white text-sm font-medium shadow-sm`}>
                        {getInitials(user.name)}
                      </div>
                      <span className={`absolute bottom-0 right-0 h-3 w-3 ${getStatusColor(user.status)} border-2 border-white dark:border-gray-800 rounded-full`}></span>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.name}
                        {user.id === currentUser.uid && (
                          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(You)</span>
                        )}
                      </p>
                      <div className="flex items-center mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {user.status === 'online' ? 'Online' : 'Away'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col" style={{ height: '600px' }}>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  General Trading Discussion
                </h3>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Live</span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/30">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500 dark:text-gray-400">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs mt-1">Be the first to start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isCurrentUser = message.userId === currentUser.uid;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-xl ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                        {/* Avatar */}
                        {!isCurrentUser && (
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full ${message.userColor} flex items-center justify-center text-white text-xs font-medium shadow-sm`}>
                            {getInitials(message.userName)}
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                          {!isCurrentUser && (
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 px-1">
                              {message.userName}
                            </span>
                          )}
                          <div
                            className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                              isCurrentUser
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-sm'
                            }`}
                          >
                            <p className="text-sm break-words leading-relaxed">{message.text}</p>
                          </div>
                          <span className={`text-xs mt-1 px-1 ${isCurrentUser ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Share your trading insights..."
                    rows={2}
                    maxLength={500}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm transition-shadow"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md disabled:shadow-none"
                  title="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">Shift+Enter</kbd> for new line
                </p>
                <div className="flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span>Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};