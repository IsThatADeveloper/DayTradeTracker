// src/components/ChatRoom.tsx - Chat with edit, delete, images, and admin controls
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Users, Activity, Clock, AlertCircle, X, Bell, BellOff, Check, Edit2, Trash2, Shield } from 'lucide-react';
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
  deleteDoc,
  Timestamp
} from 'firebase/firestore';

interface Message {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: any;
  mentions?: string[];
  edited?: boolean;
  editedAt?: any;
}

interface User {
  id: string;
  name: string;
  color: string;
  lastSeen: any;
  status: 'online' | 'away';
}

interface Notification {
  id: string;
  messageId: string;
  from: string;
  fromName: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

interface ChatRoomProps {
  currentUser?: { uid: string; displayName: string | null; email?: string | null };
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

// Replace with your actual admin email
const ADMIN_EMAILS = ['your-admin-email@example.com']; // UPDATE THIS!

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
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationSound, setNotificationSound] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const presenceIntervalRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isAdmin = ADMIN_EMAILS.includes(currentUser?.email || '');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const playNotificationSound = () => {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      };

      audioRef.current = { play: playNotificationSound } as any;
    }
  }, []);

  const getFilteredMentionUsers = () => {
    if (!mentionSearch) return activeUsers.filter(u => u.id !== currentUser?.uid);
    
    const searchLower = mentionSearch.toLowerCase();
    return activeUsers
      .filter(u => u.id !== currentUser?.uid)
      .filter(u => u.name.toLowerCase().includes(searchLower));
  };

  const filteredMentionUsers = getFilteredMentionUsers();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;

    setInputText(newValue);

    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);
        return;
      }
    }

    setShowMentionDropdown(false);
  };

  const insertMention = (user: User) => {
    if (mentionStartIndex === -1) return;

    const beforeMention = inputText.slice(0, mentionStartIndex);
    const afterMention = inputText.slice(mentionStartIndex + mentionSearch.length + 1);
    const newText = `${beforeMention}@${user.name} ${afterMention}`;

    setInputText(newText);
    setShowMentionDropdown(false);
    setMentionSearch('');
    setMentionStartIndex(-1);

    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = beforeMention.length + user.name.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const parseMentions = (text: string): { mentionedUserIds: string[]; mentionedNames: string[] } => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const matches = text.match(mentionRegex);
    
    if (!matches) return { mentionedUserIds: [], mentionedNames: [] };

    const mentionedNames = matches.map(m => m.slice(1).trim());
    const mentionedUserIds = mentionedNames
      .map(name => activeUsers.find(u => u.name === name)?.id)
      .filter(Boolean) as string[];

    return { mentionedUserIds, mentionedNames };
  };

  const renderMessageWithMentions = (text: string, messageUserId: string) => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const mentionedName = match[1];
      const isMentioningCurrentUser = mentionedName === currentUser?.displayName;

      parts.push(
        <span
          key={match.index}
          className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium ${
            isMentioningCurrentUser
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
          }`}
        >
          @{mentionedName}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const addNotification = (message: Message) => {
    if (!currentUser || message.userId === currentUser.uid) return;
    if (!message.mentions?.includes(currentUser.uid)) return;

    const notification: Notification = {
      id: message.id,
      messageId: message.id,
      from: message.userId,
      fromName: message.userName,
      text: message.text,
      timestamp: message.timestamp?.toDate?.() || new Date(),
      read: false
    };

    setNotifications(prev => [notification, ...prev]);

    if (notificationSound && audioRef.current) {
      try {
        (audioRef.current as any).play();
      } catch (error) {
        console.error('Failed to play notification sound:', error);
      }
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${message.userName} mentioned you`, {
        body: message.text.slice(0, 100),
        icon: '/logo.png',
        tag: message.id
      });
    }
  };

  const markNotificationRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Start editing a message
  const startEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
    setTimeout(() => editTextareaRef.current?.focus(), 0);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  // Save edited message
  const saveEdit = async (messageId: string) => {
    if (!editText.trim() || !currentUser) return;

    try {
      const messageRef = doc(db, 'chatMessages', messageId);
      const { mentionedUserIds } = parseMentions(editText);

      await updateDoc(messageRef, {
        text: editText.trim(),
        mentions: mentionedUserIds,
        edited: true,
        editedAt: serverTimestamp()
      });

      setEditingMessageId(null);
      setEditText('');
    } catch (err) {
      console.error('Error editing message:', err);
      alert('Failed to edit message. Please try again.');
    }
  };

  // Delete message
  const confirmDelete = (messageId: string) => {
    setDeletingMessageId(messageId);
  };

  const cancelDelete = () => {
    setDeletingMessageId(null);
  };

  const deleteMessage = async () => {
    if (!deletingMessageId) return;

    try {
      const messageRef = doc(db, 'chatMessages', deletingMessageId);
      await deleteDoc(messageRef);
      setDeletingMessageId(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message. Please try again.');
      setDeletingMessageId(null);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const setupPresence = async () => {
      try {
        const userPresenceRef = doc(db, 'chatPresence', currentUser.uid);
        
        await setDoc(userPresenceRef, {
          id: currentUser.uid,
          name: currentUser.displayName || 'Anonymous Trader',
          color: getColorForUser(currentUser.uid),
          lastSeen: serverTimestamp(),
          status: 'online'
        }, { merge: true });

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

  useEffect(() => {
    try {
      const messagesRef = collection(db, 'chatMessages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const message = { id: change.doc.id, ...change.doc.data() } as Message;
              
              if (currentUser && message.mentions?.includes(currentUser.uid) && message.userId !== currentUser.uid) {
                addNotification(message);
              }
            }
          });
          
          const allMessages: Message[] = [];
          snapshot.forEach((doc) => {
            allMessages.push({ id: doc.id, ...doc.data() } as Message);
          });
          
          setMessages(allMessages.reverse());
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
  }, [currentUser]);

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
            const isRecent = now - lastSeen < 60000;
            
            users.push({
              ...userData,
              status: isRecent ? 'online' : 'away'
            });
          });
          
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
      const { mentionedUserIds } = parseMentions(inputText);
      
      await addDoc(messagesRef, {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous Trader',
        userColor: getColorForUser(currentUser.uid),
        text: inputText.trim(),
        timestamp: serverTimestamp(),
        mentions: mentionedUserIds
      });

      setInputText('');
      setShowMentionDropdown(false);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showMentionDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => 
          Math.min(prev + 1, filteredMentionUsers.length - 1)
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMentionUsers[selectedMentionIndex]) {
          insertMention(filteredMentionUsers[selectedMentionIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-md">
              <MessageSquare className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                Trading Chat Room
                {isAdmin && (
                  <span className="ml-3 px-2 py-1 bg-yellow-500 text-xs rounded-full flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    ADMIN
                  </span>
                )}
              </h2>
              <p className="text-blue-100 mt-1 flex items-center text-sm">
                <Activity className="h-4 w-4 mr-1" />
                Connect with traders in real-time
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-white hover:bg-blue-500/50 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Mentions ({unreadCount} new)
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setNotificationSound(!notificationSound)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                        title={notificationSound ? 'Mute notifications' : 'Unmute notifications'}
                      >
                        {notificationSound ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </button>
                      {notifications.length > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No mentions yet</p>
                        <p className="text-xs mt-1">You'll be notified when someone @ mentions you</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                              !notification.read ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div className={`h-8 w-8 rounded-full ${getColorForUser(notification.from)} flex items-center justify-center text-white text-xs font-medium flex-shrink-0`}>
                                  {getInitials(notification.fromName)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {notification.fromName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTime(notification.timestamp)}
                                  </p>
                                </div>
                              </div>
                              {!notification.read && (
                                <button
                                  onClick={() => markNotificationRead(notification.id)}
                                  className="flex-shrink-0 ml-2 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                  title="Mark as read"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                              {notification.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={clearAllNotifications}
                        className="w-full text-xs text-red-600 dark:text-red-400 hover:underline py-1"
                      >
                        Clear all notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-600" />
                Active Traders
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Type @ to mention
              </p>
            </div>

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

        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col" style={{ height: '600px' }}>
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
                  const isMentioned = message.mentions?.includes(currentUser.uid);
                  const canModify = isCurrentUser || isAdmin;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div className={`flex max-w-xl ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                        {!isCurrentUser && (
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full ${message.userColor} flex items-center justify-center text-white text-xs font-medium shadow-sm`}>
                            {getInitials(message.userName)}
                          </div>
                        )}

                        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                          {!isCurrentUser && (
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 px-1">
                              {message.userName}
                            </span>
                          )}

                          {editingMessageId === message.id ? (
                            <div className="w-full max-w-md">
                              <textarea
                                ref={editTextareaRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none"
                                rows={2}
                                maxLength={500}
                              />
                              <div className="flex items-center justify-end space-x-2 mt-2">
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveEdit(message.id)}
                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div
                                className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                  isMentioned && !isCurrentUser
                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-gray-900 dark:text-white border-2 border-yellow-300 dark:border-yellow-600 rounded-bl-sm'
                                    : isCurrentUser
                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-sm'
                                }`}
                              >
                                <p className="text-sm break-words leading-relaxed">
                                  {renderMessageWithMentions(message.text, message.userId)}
                                </p>
                                {message.edited && (
                                  <span className="text-xs opacity-70 ml-2">(edited)</span>
                                )}
                              </div>
                              
                              <div className={`mt-1 px-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                                <div className={`text-xs ${isCurrentUser ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {formatTime(message.timestamp)}
                                </div>
                                
                                {canModify && deletingMessageId !== message.id && (
                                  <div className={`inline-flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                    {isCurrentUser && (
                                      <button
                                        onClick={() => startEdit(message)}
                                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center"
                                      >
                                        <Edit2 className="h-3 w-3 mr-1" />
                                        Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={() => confirmDelete(message.id)}
                                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center"
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Delete
                                    </button>
                                  </div>
                                )}

                                {deletingMessageId === message.id && (
                                  <div className={`inline-flex items-center space-x-2 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded mt-1`}>
                                    <span className="text-xs text-red-800 dark:text-red-200 font-medium">Delete this message?</span>
                                    <button
                                      onClick={deleteMessage}
                                      className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={cancelDelete}
                                      className="text-xs px-2 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700"
                                    >
                                      No
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
              {showMentionDropdown && filteredMentionUsers.length > 0 && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1 flex items-center justify-between">
                      <span>Mention someone</span>
                      <button
                        onClick={() => setShowMentionDropdown(false)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {filteredMentionUsers.map((user, index) => (
                      <button
                        key={user.id}
                        onClick={() => insertMention(user)}
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                          index === selectedMentionIndex
                            ? 'bg-blue-50 dark:bg-blue-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-full ${user.color} flex items-center justify-center text-white text-xs font-medium shadow-sm flex-shrink-0`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.status === 'online' ? 'Online' : 'Away'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    placeholder="Share your trading insights... (Type @ to mention someone)"
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
                  <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">@</kbd> to mention
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