"use client";

import { readFilesAsDataUrls } from "@/lib/survey-work";

export function PhotoField({
  label,
  photos,
  onChange,
}: {
  label: string;
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const urls = await readFilesAsDataUrls(files);
    onChange([...photos, ...urls]);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleCapture}
        className="text-sm"
      />
      {photos.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((foto, i) => (
            <div key={i} className="relative">
              <img
                src={foto}
                alt={`${label} ${i + 1}`}
                className="aspect-square rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
