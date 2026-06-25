"use client";

import type { GeneralPhotos } from "@/lib/types";
import { GENERAL_PHOTO_CATEGORIES } from "@/lib/survey-work";
import { PhotoField } from "./PhotoField";

export function GeneralPhotosSection({
  fotosGenerales,
  onChange,
}: {
  fotosGenerales: GeneralPhotos;
  onChange: (fotos: GeneralPhotos) => void;
}) {
  return (
    <div className="space-y-4">
      {GENERAL_PHOTO_CATEGORIES.map(({ key, label }) => (
        <PhotoField
          key={key}
          label={label}
          photos={fotosGenerales[key] ?? []}
          onChange={(photos) => onChange({ ...fotosGenerales, [key]: photos })}
        />
      ))}
    </div>
  );
}
