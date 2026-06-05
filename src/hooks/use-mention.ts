import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useMention() {
  const [suggestions, setSuggestions] = useState<{ username: string; name: string; avatar_url: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);

  const handleTextChange = async (val: string, selectionStart: number) => {
    const textBeforeCursor = val.slice(0, selectionStart);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx !== -1) {
      const charBeforeAt = lastAtIdx === 0 ? " " : textBeforeCursor[lastAtIdx - 1];
      const textAfterAt = textBeforeCursor.slice(lastAtIdx + 1);

      // If it contains spaces or isn't preceded by space/newline, don't trigger
      if (!/\s/.test(textAfterAt) && (charBeforeAt === " " || charBeforeAt === "\n")) {
        setMentionTriggerIndex(lastAtIdx);
        setShowSuggestions(true);

        const query = textAfterAt.toLowerCase();
        const { data } = await supabase
          .from("profiles")
          .select("username, name, avatar_url")
          .ilike("username", `%${query}%`)
          .limit(5);

        setSuggestions(data ?? []);
        setActiveIndex(0);
        return;
      }
    }

    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    text: string,
    setText: (t: string) => void
  ) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertMention(suggestions[activeIndex].username, text, setText);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const insertMention = (username: string, text: string, setText: (t: string) => void) => {
    if (mentionTriggerIndex === -1) return;
    const beforeMention = text.slice(0, mentionTriggerIndex);
    const afterMention = text.slice(mentionTriggerIndex + 1);
    const nextSpaceIdx = afterMention.indexOf(" ");
    const restOfText = nextSpaceIdx !== -1 ? afterMention.slice(nextSpaceIdx) : "";

    const newText = beforeMention + `@${username} ` + restOfText.trimStart();
    setText(newText);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return {
    suggestions,
    showSuggestions,
    setShowSuggestions,
    activeIndex,
    setActiveIndex,
    handleTextChange,
    handleKeyDown,
    insertMention,
  };
}
