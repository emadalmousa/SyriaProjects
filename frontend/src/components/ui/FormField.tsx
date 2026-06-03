import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-2)]";
const inputCls = "w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-[var(--clr-text)] placeholder-[var(--clr-text-3)] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-surface disabled:opacity-60 disabled:cursor-not-allowed"
const ltrInputCls = inputCls;

interface FieldWrapProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FieldWrap({ label, required, children, className = "" }: FieldWrapProps) {
  return (
    <div className={className}>
      <label className={labelCls}>
        {label}{required && " *"}
      </label>
      {children}
    </div>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  wrapClass?: string;
  ltr?: boolean;
}

export function InputField({ label, wrapClass = "", required, className = "", ltr, ...props }: InputFieldProps) {
  return (
    <FieldWrap label={label} required={required} className={wrapClass}>
      <input
        required={required}
        dir={ltr ? "ltr" : undefined}
        className={`${ltr ? ltrInputCls : inputCls} ${className}`}
        {...props}
      />
    </FieldWrap>
  );
}

// ── Select ─────────────────────────────────────────────────────────────────

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  wrapClass?: string;
  children: React.ReactNode;
}

export function SelectField({ label, wrapClass = "", children, className = "", ...props }: SelectFieldProps) {
  return (
    <FieldWrap label={label} className={wrapClass}>
      <select dir="ltr" className={`${ltrInputCls} ${className}`} {...props}>
        {children}
      </select>
    </FieldWrap>
  );
}

// ── Textarea ───────────────────────────────────────────────────────────────

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  wrapClass?: string;
}

export function TextareaField({ label, wrapClass = "", required, className = "", ...props }: TextareaFieldProps) {
  return (
    <FieldWrap label={label} required={required} className={wrapClass}>
      <textarea
        required={required}
        className={`${inputCls} resize-none ${className}`}
        {...props}
      />
    </FieldWrap>
  );
}

// ── Password Input (with eye toggle) ──────────────────────────────────────

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  wrapClass?: string;
  show: boolean;
  onToggleShow: () => void;
}

export function PasswordField({ label, wrapClass = "", show, onToggleShow, required, className = "", ...props }: PasswordFieldProps) {
  return (
    <FieldWrap label={label} required={required} className={wrapClass}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required={required}
          dir="ltr"
          className={`${ltrInputCls} pr-10 ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--clr-text-3)] hover:text-[var(--clr-text-2)]"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </FieldWrap>
  );
}
