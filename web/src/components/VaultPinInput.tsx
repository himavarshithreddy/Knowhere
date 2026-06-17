import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";

type VaultPinInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
};

export function VaultPinInput({ value, onChange, disabled, onComplete, autoFocus = true, error }: VaultPinInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, val: string) => {
    if (disabled) return;
    const digit = val.replace(/\D/g, "").slice(-1);
    const charArray = value.padEnd(4, " ").split("");
    if (digit) {
      charArray[index] = digit;
      const newValue = charArray.join("").trim();
      onChange(newValue);
      if (index < 3) {
        inputsRef.current[index + 1]?.focus();
      } else if (newValue.length === 4) {
        onComplete?.(newValue);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      const charArray = value.padEnd(4, " ").split("");
      if (charArray[index] !== " ") {
        charArray[index] = " ";
        onChange(charArray.join("").trimEnd());
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        const prevArray = value.padEnd(4, " ").split("");
        prevArray[index - 1] = " ";
        onChange(prevArray.join("").trimEnd());
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, 4);
    if (pastedData) {
      onChange(pastedData);
      if (pastedData.length === 4) {
        inputsRef.current[3]?.focus();
        onComplete?.(pastedData);
      } else {
        inputsRef.current[pastedData.length]?.focus();
      }
    }
  };

  return (
    <div className={`vault-pin-inputs ${error ? "error" : ""}`} style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
      {[0, 1, 2, 3].map((index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="vault-pin-box"
        />
      ))}
    </div>
  );
}
