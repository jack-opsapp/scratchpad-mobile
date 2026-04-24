import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { useDataStore } from '../stores/dataStore';
import { useAuthStore } from '../stores/authStore';

/**
 * Undo/Redo hook for note operations on mobile.
 *
 * Action types:
 * - create_note: { noteId, note }
 * - delete_note: { noteId, note }
 * - toggle_note: { noteId, previousCompleted }
 * - edit_note: { noteId, previousContent, newContent }
 * - move_note: { noteId, previousSectionId, newSectionId }
 */

interface UndoAction {
  type: string;
  noteId: string;
  note?: any;
  previousCompleted?: boolean;
  previousContent?: string;
  newContent?: string;
  previousSectionId?: string;
  newSectionId?: string;
}

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const undoStackRef = useRef<UndoAction[]>([]);
  const redoStackRef = useRef<UndoAction[]>([]);

  const pushUndo = useCallback((action: UndoAction) => {
    setUndoStack(prev => {
      const next = [...prev, action].slice(-MAX_HISTORY);
      undoStackRef.current = next;
      return next;
    });
    setRedoStack([]);
    redoStackRef.current = [];
  }, []);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return false;

    const action = stack[stack.length - 1];
    const newUndo = stack.slice(0, -1);
    undoStackRef.current = newUndo;
    setUndoStack(newUndo);

    setRedoStack(prev => {
      const next = [...prev, action];
      redoStackRef.current = next;
      return next;
    });

    const { addNote, updateNote, removeNote, moveNote } = useDataStore.getState();
    const user = useAuthStore.getState().user;

    switch (action.type) {
      case 'create_note':
        // Remove the created note
        removeNote(action.noteId);
        break;

      case 'delete_note':
        if (action.note) {
          // Restore the deleted note
          addNote(action.note);
          // Re-insert into Supabase
          supabase.from('notes').insert({
            id: action.note.id,
            section_id: action.note.section_id,
            content: action.note.content,
            tags: action.note.tags || [],
            completed: action.note.completed || false,
            date: action.note.date || null,
            created_by_user_id: action.note.created_by_user_id,
          });
        }
        break;

      case 'toggle_note':
        updateNote(action.noteId, {
          completed: action.previousCompleted,
          completed_by_user_id: action.previousCompleted ? user?.id ?? null : null,
          completed_at: action.previousCompleted ? new Date().toISOString() : null,
        });
        break;

      case 'edit_note':
        if (action.previousContent !== undefined) {
          updateNote(action.noteId, { content: action.previousContent });
        }
        break;

      case 'move_note':
        if (action.previousSectionId) {
          moveNote(action.noteId, action.previousSectionId);
        }
        break;
    }

    return true;
  }, []);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return false;

    const action = stack[stack.length - 1];
    const newRedo = stack.slice(0, -1);
    redoStackRef.current = newRedo;
    setRedoStack(newRedo);

    setUndoStack(prev => {
      const next = [...prev, action];
      undoStackRef.current = next;
      return next;
    });

    const { addNote, updateNote, removeNote, moveNote } = useDataStore.getState();
    const user = useAuthStore.getState().user;

    switch (action.type) {
      case 'create_note':
        if (action.note) {
          addNote(action.note);
          supabase.from('notes').insert({
            id: action.note.id,
            section_id: action.note.section_id,
            content: action.note.content,
            tags: action.note.tags || [],
            completed: action.note.completed || false,
            date: action.note.date || null,
            created_by_user_id: action.note.created_by_user_id,
          });
        }
        break;

      case 'delete_note':
        removeNote(action.noteId);
        break;

      case 'toggle_note': {
        const newCompleted = !action.previousCompleted;
        updateNote(action.noteId, {
          completed: newCompleted,
          completed_by_user_id: newCompleted ? user?.id ?? null : null,
          completed_at: newCompleted ? new Date().toISOString() : null,
        });
        break;
      }

      case 'edit_note':
        if (action.newContent !== undefined) {
          updateNote(action.noteId, { content: action.newContent });
        }
        break;

      case 'move_note':
        if (action.newSectionId) {
          moveNote(action.noteId, action.newSectionId);
        }
        break;
    }

    return true;
  }, []);

  const promptUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const action = stack[stack.length - 1];
    const desc = {
      create_note: 'note creation',
      delete_note: 'note deletion',
      toggle_note: 'completion change',
      edit_note: 'note edit',
      move_note: 'note move',
    }[action.type] || 'action';

    Alert.alert('Undo', `Undo ${desc}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Undo', onPress: () => undo() },
    ]);
  }, [undo]);

  return {
    pushUndo,
    undo,
    redo,
    promptUndo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
