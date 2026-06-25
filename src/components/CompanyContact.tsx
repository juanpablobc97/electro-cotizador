import {
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_LEGAL_NAME,
  COMPANY_NAME,
  COMPANY_PHONE,
  COMPANY_PHONE_DISPLAY,
  COMPANY_RFC,
} from "@/lib/branding";

type CompanyContactProps = {
  variant?: "light" | "dark";
  compact?: boolean;
};

export function CompanyContact({ variant = "light", compact = false }: CompanyContactProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={
        isDark ? "text-xs leading-relaxed text-white/60" : "text-sm leading-relaxed text-slate-600"
      }
    >
      {!compact && (
        <p className={`mb-1 font-semibold ${isDark ? "text-white/90" : "text-brand-navy"}`}>
          {COMPANY_NAME}
        </p>
      )}
      <p>{COMPANY_LEGAL_NAME}</p>
      <p>RFC: {COMPANY_RFC}</p>
      <p>{COMPANY_ADDRESS}</p>
      <p className="mt-1">
        <a
          href={`tel:+52${COMPANY_PHONE}`}
          className={isDark ? "hover:text-brand-gold" : "text-brand-navy hover:underline"}
        >
          Tel: {COMPANY_PHONE_DISPLAY}
        </a>
      </p>
      <p>
        <a
          href={`mailto:${COMPANY_EMAIL}`}
          className={isDark ? "hover:text-brand-gold" : "text-brand-navy hover:underline"}
        >
          {COMPANY_EMAIL}
        </a>
      </p>
    </div>
  );
}
