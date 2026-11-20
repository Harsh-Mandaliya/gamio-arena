import { useId } from 'react';

/**
 * Label + control + hint/error. Pass the control as `children` or use the
 * `as` shortcut: <Field label="Email" name="email" type="email" />.
 */
export default function Field({ label, hint, error, as = 'input', children, className = '', ...props }) {
  const id = useId();
  const Control = as;
  const controlClass = as === 'select' ? 'select' : as === 'textarea' ? 'textarea' : 'input';

  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      {children && as === 'input' && !props.name ? (
        children
      ) : (
        <Control id={id} className={controlClass} aria-invalid={Boolean(error)} {...props}>
          {children}
        </Control>
      )}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}
