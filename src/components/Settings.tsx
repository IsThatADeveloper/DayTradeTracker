// src/components/Settings.tsx
import React, { useState, useEffect } from 'react';
import { X, GripVertical, Eye, EyeOff, RotateCcw, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  visible: boolean;
  order: number;
}

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: NavigationItem[];
  onSave: (items: NavigationItem[]) => Promise<void>;
  onReset: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  navigationItems,
  onSave,
  onReset
}) => {
  const [items, setItems] = useState<NavigationItem[]>(navigationItems);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setItems(navigationItems);
    setHasChanges(false);
  }, [navigationItems]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);

    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      order: index
    }));

    setItems(updatedItems);
    setHasChanges(true);
  };

  const toggleVisibility = (id: string) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, visible: !item.visible } : item
    );
    setItems(updatedItems);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(items);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default navigation settings?')) {
      onReset();
      setHasChanges(false);
    }
  };

  if (!isOpen) return null;

  const visibleCount = items.filter(item => item.visible).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Navigation Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Customize your sidebar navigation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 text-sm">
                  <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">
                    How to customize
                  </p>
                  <ul className="text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Drag items using the grip handle to reorder</li>
                    <li>• Click the eye icon to show/hide navigation items</li>
                    <li>• At least one item must remain visible</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Navigation Items
              </h3>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {visibleCount} of {items.length} visible
              </span>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="navigation-items">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {items.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 transition-all ${
                            snapshot.isDragging
                              ? 'border-blue-500 shadow-lg'
                              : 'border-transparent'
                          } ${
                            !item.visible ? 'opacity-50' : ''
                          }`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {item.label}
                              </h4>
                              {!item.visible && (
                                <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {item.description}
                            </p>
                          </div>

                          <button
                            onClick={() => toggleVisibility(item.id)}
                            disabled={item.visible && visibleCount === 1}
                            className={`ml-4 p-2 rounded-lg transition-colors ${
                              item.visible && visibleCount === 1
                                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            title={
                              item.visible && visibleCount === 1
                                ? 'At least one item must be visible'
                                : item.visible
                                ? 'Hide this item'
                                : 'Show this item'
                            }
                          >
                            {item.visible ? (
                              <Eye className="h-5 w-5" />
                            ) : (
                              <EyeOff className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${
                hasChanges && !isSaving
                  ? 'hover:bg-blue-700'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};