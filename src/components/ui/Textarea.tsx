import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30",
          className,
        )}
        rows={4}
        {...props}
      />
    </div>
  );
}
