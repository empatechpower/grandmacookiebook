"use client";
import { useRef } from "react";
import { sendMessage } from "@/app/actions/messages";
import { SubmitButton } from "./SubmitButton";

export function Composer({ conversationId, draft }: { conversationId: string; draft?: string }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      className="composer"
      action={async (fd) => {
        await sendMessage(fd);
        // Clear directly: reset() would restore the prefilled draft.
        const box = form.current?.querySelector("textarea");
        if (box) box.value = "";
      }}
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <textarea
        name="body"
        required
        maxLength={2000}
        defaultValue={draft}
        placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
        aria-label="Message"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            form.current?.requestSubmit();
          }
        }}
      />
      <SubmitButton className="btn btn-terra" pendingText="Sending…">Send</SubmitButton>
    </form>
  );
}
