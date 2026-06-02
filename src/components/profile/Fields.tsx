import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { Option } from "../../data/profileOptions";

/** A titled card grouping related fields. */
export function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
        <span className="text-base">{icon}</span>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-white/50">{label}</label>
      {children}
    </div>
  );
}

/** Single-select chip group. Tapping the active chip clears it (optional field). */
export function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <motion.button
            key={o.value}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(active ? undefined : o.value)}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 transition ${
              active
                ? "bg-pink-500/30 text-white ring-pink-400/70"
                : "bg-white/5 text-white/70 ring-white/10"
            }`}
          >
            {o.emoji ? `${o.emoji} ` : ""}
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Multi-select chip cloud over plain string values. */
export function ChipCloud({
  options,
  values,
  onChange,
  max,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  function toggle(o: string) {
    if (values.includes(o)) {
      onChange(values.filter((v) => v !== o));
    } else if (!max || values.length < max) {
      onChange([...values, o]);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <motion.button
            key={o}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => toggle(o)}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 transition ${
              active
                ? "bg-violet-500/30 text-white ring-violet-400/70"
                : "bg-white/5 text-white/70 ring-white/10"
            }`}
          >
            {o}
          </motion.button>
        );
      })}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm outline-none ring-1 ring-white/15 placeholder:text-white/30 focus:ring-pink-400/60"
    />
  );
}

/** Labeled 0–100 slider for spectrum traits (e.g. introvert↔extrovert). */
export function Slider({
  value,
  onChange,
  left,
  right,
}: {
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
}) {
  return (
    <div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-pink-500"
      />
      <div className="mt-1 flex justify-between text-xs text-white/40">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
