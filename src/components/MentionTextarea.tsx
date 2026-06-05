import React, { useRef, useEffect, useCallback } from "react";
import { useMention } from "@/hooks/use-mention";

interface MentionTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
}

export function MentionTextarea({
  value,
  onValueChange,
  className,
  ...rest
}: MentionTextareaProps) {
  const {
    suggestions,
    showSuggestions,
    activeIndex,
    setActiveIndex,
    handleTextChange,
    handleKeyDown,
    insertMention,
  } = useMention();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll the active suggestion into view
  useEffect(() => {
    if (!dropdownRef.current) return;
    const active = dropdownRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onValueChange(val);
      handleTextChange(val, e.target.selectionStart ?? val.length);
    },
    [onValueChange, handleTextChange]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      handleKeyDown(e, value, onValueChange);
    },
    [handleKeyDown, value, onValueChange]
  );

  const onSelectSuggestion = useCallback(
    (username: string) => {
      insertMention(username, value, onValueChange);
      textareaRef.current?.focus();
    },
    [insertMention, value, onValueChange]
  );

  return (
    <div className="mention-container" style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={className}
        {...rest}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="mention-dropdown"
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            marginBottom: "4px",
            width: "min(100%, 320px)",
            maxHeight: "220px",
            overflowY: "auto",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            zIndex: 50,
            padding: "4px",
          }}
        >
          {suggestions.map((s, idx) => (
            <button
              key={s.username}
              type="button"
              data-active={idx === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent textarea blur
                onSelectSuggestion(s.username);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "13px",
                transition: "background 0.12s",
                background:
                  idx === activeIndex
                    ? "var(--accent)"
                    : "transparent",
                color: "var(--popover-foreground)",
              }}
            >
              {s.avatar_url ? (
                <img
                  src={s.avatar_url}
                  alt=""
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "var(--accent-foreground)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: "12px",
                    flexShrink: 0,
                  }}
                >
                  {s.name?.[0]?.toUpperCase() || "@"}
                </span>
              )}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted-foreground)",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  @{s.username}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
