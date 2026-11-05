import React, { useRef, useLayoutEffect } from 'react';
import type { ChangeEvent, TextareaHTMLAttributes } from 'react';

export interface UppercaseTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export const UppercaseTextarea = React.forwardRef<HTMLTextAreaElement, UppercaseTextareaProps>(
  ({ value, onValueChange, onChange, className = '', ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
    const caretPos = useRef<{ start: number; end: number } | null>(null);

    // Restaura a posição do cursor imediatamente após o React atualizar o valor em maiúsculas
    useLayoutEffect(() => {
      if (caretPos.current !== null && textareaRef.current) {
        const { start, end } = caretPos.current;
        const el = textareaRef.current;

        try {
          el.setSelectionRange(start, end);
        } catch (_) {}

        // Fallback para navegadores móveis (Android Chrome / iOS Safari)
        const raf = requestAnimationFrame(() => {
          try {
            if (document.activeElement === el) {
              el.setSelectionRange(start, end);
            }
          } catch (_) {}
        });

        caretPos.current = null;
        return () => cancelAnimationFrame(raf);
      }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      const target = e.target;
      // Salva a posição exata do cursor onde a edição foi feita
      caretPos.current = {
        start: target.selectionStart,
        end: target.selectionEnd
      };

      const upperVal = target.value.toUpperCase();

      if (onValueChange) {
        onValueChange(upperVal);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        className={`uppercase ${className}`}
        {...props}
      />
    );
  }
);

UppercaseTextarea.displayName = 'UppercaseTextarea';

export default UppercaseTextarea;
