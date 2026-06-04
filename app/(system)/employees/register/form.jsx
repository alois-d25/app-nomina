export default function FormField({ label, name, value, onChange, error, required, type = "text", placeholder, className = "", prefix, children, ...props }) {
  const isSelect = type === "select";
  
  return (
    <div className={`form-control ${className}`}>
      <label className="label">
        <span className="label-text font-medium">
          {label} {required && <span className="text-error">*</span>}
        </span>
      </label>
      <div className={prefix ? "relative" : ""}>
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
            {prefix}
          </span>
        )}
        {isSelect ? (
          <select name={name} value={value} onChange={onChange} className={`select select-bordered w-full ${error ? "select-error" : ""}`} {...props}>
            {children}
          </select>
        ) : (
          <input name={name} value={value} onChange={onChange} placeholder={placeholder} type={type} className={`input input-bordered w-full ${error ? "input-error" : ""} ${prefix ? "pl-12" : ""}`} {...props} />
        )}
      </div>
      {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
    </div>
  );
}
