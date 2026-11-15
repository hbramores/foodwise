import { useState } from "react";
import { Utensils } from "lucide-react";
import type { Dish } from "../types";

export function resolveImageSrc(image: string | null | undefined): string | null {
  if (!image) return null;
  if (image.startsWith("data:") || image.startsWith("http") || image.startsWith("/")) {
    return image;
  }
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${image}`.replace(/\/{2,}/g, "/");
}

interface DishImageProps {
  dish: Pick<Dish, "name" | "image">;
  className?: string;
  sizes?: string;
  rounded?: boolean;
}

export function DishImage({ dish, className, rounded }: DishImageProps) {
  const src = resolveImageSrc(dish.image);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`dishimg ${className ?? ""}`}
        style={rounded ? { borderRadius: 12 } : undefined}
      >
        <PlaceholderArt />
      </div>
    );
  }

  return (
    <div className={`dishimg ${className ?? ""}`} style={rounded ? { borderRadius: 12 } : undefined}>
      <img src={src} alt={`${dish.name}, a dish on the menu`} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

export function PlaceholderArt() {
  return (
    <div className="dishimg__ph" aria-hidden="true">
      <Utensils style={{ width: 30, height: 30, strokeWidth: 1.4 }} />
      <small>No photo yet</small>
    </div>
  );
}
