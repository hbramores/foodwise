import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, formatLong } from "../lib/date";
import { IconButton } from "./ui";

export function DateSelector({
  value,
  onChange,
  label,
  min,
  max,
  id,
}: {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  min?: string;
  max?: string;
  id?: string;
}) {
  const inputId = id ?? "datesel";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {label ? (
        <label className="field__label" htmlFor={inputId} style={{ whiteSpace: "nowrap" }}>
          {label}
        </label>
      ) : null}
      <IconButton
        label="Previous day"
        size="sm"
        onClick={() => onChange(addDaysISO(value, -1))}
        disabled={min ? addDaysISO(value, -1) < min : false}
      >
        <ChevronLeft className="ico" />
      </IconButton>
      <label className="datesel" htmlFor={inputId} title={formatLong(value)}>
        <CalendarDays className="ico" aria-hidden="true" />
        <input
          id={inputId}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
        />
      </label>
      <IconButton
        label="Next day"
        size="sm"
        onClick={() => onChange(addDaysISO(value, 1))}
        disabled={max ? addDaysISO(value, 1) > max : false}
      >
        <ChevronRight className="ico" />
      </IconButton>
    </div>
  );
}
