'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface EditableCellProps {
  value: string | number | boolean | undefined | null;
  type: 'text' | 'number' | 'select' | 'toggle' | 'textarea';
  options?: string[];
  onSave: (newValue: string | number | boolean) => Promise<void>;
  className?: string;
  required?: boolean;
  allowEmpty?: boolean;
  placeholder?: string;
}

export function EditableCell({ 
  value, 
  type, 
  options, 
  onSave, 
  className,
  required = false,
  allowEmpty = true,
  placeholder,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  // Handle undefined/null values - provide defaults based on type
  // Always returns a string since editValue is always a string (except for toggle which doesn't use editValue)
  const getDefaultValue = (): string => {
    if (value === undefined || value === null) {
      if (type === 'number') return '0';
      if (type === 'toggle') return 'false'; // Convert to string for consistency
      return '';
    }
    return value.toString();
  };
  const [editValue, setEditValue] = useState<string>(getDefaultValue());
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when value prop changes (but not while editing)
  useEffect(() => {
    if (!isEditing) {
      if (value === undefined || value === null) {
        if (type === 'number') {
          setEditValue('0');
        } else if (type === 'toggle') {
          // Toggle doesn't use editValue, so skip
        } else {
          setEditValue('');
        }
      } else {
        setEditValue(value.toString());
      }
    }
  }, [value, type, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (type === 'toggle') {
      handleToggle();
    } else {
      setIsEditing(true);
      setEditValue(getDefaultValue());
    }
  };

  const handleToggle = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await onSave(!(value ?? false));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const validateValue = (val: string): string | null => {
    if (required && (!val || val.trim() === '')) {
      return 'Este campo es requerido';
    }
    if (type === 'number') {
      const numValue = parseFloat(val);
      if (isNaN(numValue)) {
        return 'Debe ser un número válido';
      }
      if (numValue < 0) {
        return 'No puede ser negativo';
      }
    }
    return null;
  };

  const handleBlur = async () => {
    if (!isEditing) return;
    
    setIsEditing(false);
    
    // Trim whitespace for text fields
    const trimmedValue = type !== 'number' && type !== 'toggle' ? editValue.trim() : editValue;
    
    // Validate
    const validationError = validateValue(trimmedValue);
    if (validationError) {
      setSaveStatus('error');
      setEditValue(getDefaultValue()); // Revert on validation error
      setTimeout(() => setSaveStatus('idle'), 2000);
      return;
    }
    
    // Check if value changed
    // editValue is always a string, so convert based on type
    let newValue: string | number | boolean;
    if (type === 'number') {
      const numValue = parseFloat(trimmedValue);
      newValue = isNaN(numValue) ? 0 : numValue;
    } else if (type === 'toggle') {
      // Toggle is handled separately
      return;
    } else {
      // For optional fields, empty string becomes empty string (will be converted to undefined in handleFieldUpdate)
      newValue = trimmedValue;
    }
    
    const currentValue = value ?? (type === 'number' ? 0 : '');
    if (newValue === currentValue) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      await onSave(newValue);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1000);
    } catch (error) {
      setSaveStatus('error');
      setEditValue(getDefaultValue()); // Revert on error
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(getDefaultValue());
      setSaveStatus('idle');
    }
  };

  const handleSelectChange = async (newValue: string) => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await onSave(newValue);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  if (type === 'toggle') {
    const boolValue = typeof value === 'boolean' ? value : Boolean(value);
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Checkbox
          checked={boolValue}
          onCheckedChange={handleToggle}
          disabled={isSaving}
          className="cursor-pointer"
        />
        {saveStatus === 'saving' && (
          <span className="ml-2 text-xs text-gray-500">Guardando...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="ml-2 text-xs text-emerald-600">✓</span>
        )}
        {saveStatus === 'error' && (
          <span className="ml-2 text-xs text-red-600">✗</span>
        )}
      </div>
    );
  }

  if (isEditing) {
    if (type === 'select' && options) {
      return (
        <Select
          value={editValue}
          onValueChange={handleSelectChange}
          onOpenChange={(open) => {
            if (!open && saveStatus === 'idle') {
              setIsEditing(false);
            }
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'textarea') {
      return (
        <div className="relative w-full">
          <textarea
            ref={inputRef as any}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditing(false);
                setEditValue(getDefaultValue());
                setSaveStatus('idle');
              } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleBlur();
              }
            }}
            className={`w-full min-h-[60px] max-h-[120px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y ${
              saveStatus === 'error' ? 'border-red-500' : ''
            } ${className || ''}`}
            disabled={isSaving}
            placeholder={placeholder}
            rows={3}
          />
          {saveStatus === 'saving' && (
            <span className="absolute right-2 top-2 text-xs text-gray-500">
              Guardando...
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="absolute right-2 top-2 text-xs text-red-600">
              Error
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="relative">
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`h-8 text-sm ${saveStatus === 'error' ? 'border-red-500' : ''} ${className || ''}`}
          disabled={isSaving}
          placeholder={placeholder}
        />
        {saveStatus === 'saving' && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            Guardando...
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-600">
            Error
          </span>
        )}
        {allowEmpty && value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditValue('');
              handleBlur();
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Borrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  const displayValue = value?.toString() ?? (placeholder || '-');
  const isEmpty = !value || (typeof value === 'string' && value.trim() === '');

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer hover:bg-gray-50 px-2 py-1 rounded min-h-[32px] flex items-center ${
        required && isEmpty ? 'border-l-2 border-l-red-300' : ''
      } ${className || ''}`}
      title={required && isEmpty ? 'Campo requerido - Click para editar' : 'Click para editar'}
    >
      <span className={`text-sm ${isEmpty && !required ? 'text-gray-400 italic' : ''}`}>
        {isEmpty && !required ? (placeholder || 'Opcional') : displayValue}
      </span>
      {required && (
        <span className="ml-1 text-red-500 text-xs">*</span>
      )}
      {saveStatus === 'saved' && (
        <span className="ml-2 text-xs text-emerald-600">✓</span>
      )}
    </div>
  );
}
