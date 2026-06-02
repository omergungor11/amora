import { motion } from "motion/react";
import { useProfile } from "../store/useProfile";
import { useTaste } from "../store/useTaste";
import { useAuth } from "../lib/useAuth";
import { linkGoogle } from "../lib/session";
import { ageFromDate, zodiac, risingSign } from "../lib/astro";
import {
  SMOKING, DRINKING, EXERCISE, DIET, POLITICS, RELIGION, KIDS,
  PET_ATTITUDE, RELATIONSHIP, INTERESTS,
} from "../data/profileOptions";
import {
  Section, Field, ChipGroup, ChipCloud, TextInput, Slider,
} from "../components/profile/Fields";
import { PhotoGrid } from "../components/profile/PhotoGrid";

export default function Profile() {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const clear = useProfile((s) => s.clear);
  const tasteInsight = useTaste((s) => s.insight)();
  const topTags = useTaste((s) => s.topTags)(6);
  const likes = useTaste((s) => s.likes);
  const resetTaste = useTaste((s) => s.reset);
  const auth = useAuth();

  if (!profile) return null;

  const age = ageFromDate(profile.birthDate);
  const sun = zodiac(profile.birthDate);
  const rising = risingSign(profile.birthDate, profile.birthTime);

  return (
    <div className="mx-auto h-full w-full max-w-md overflow-y-auto px-2 pb-6">
      {/* header */}
      <header className="flex flex-col items-center pt-4 text-center">
        <div className="h-24 w-24 overflow-hidden rounded-full ring-2 ring-pink-400/50">
          {profile.photos[0] && (
            <img
              src={profile.photos[0]}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <h1 className="mt-3 text-2xl font-bold">
          {profile.name}
          {age !== null && <span className="font-light">, {age}</span>}
        </h1>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
          {sun && (
            <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
              {sun.emoji} {sun.name} · {sun.element}
            </span>
          )}
          {rising && (
            <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
              ↑ Yükselen {rising.name}
            </span>
          )}
        </div>
      </header>

      {/* Senin Tipin — Taste Coach summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 rounded-3xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 p-4 ring-1 ring-white/10"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          🧭 Senin Tipin
        </h3>
        {tasteInsight ? (
          <>
            <p className="mt-1.5 text-sm text-white/90">{tasteInsight}</p>
            {topTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {topTags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/10"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-1.5 text-sm text-white/60">
            {likes > 0
              ? "Birkaç beğeni daha yap, tipini çözmeye başlayayım."
              : "Keşfet'te kaydırmaya başla — seçimlerinden tipini öğreneceğim."}
          </p>
        )}
      </motion.div>

      {/* editable sections (all optional) */}
      <div className="mt-5 space-y-4">
        <Section title="Fotoğraflar" icon="📸">
          <PhotoGrid
            photos={profile.photos}
            onChange={(photos) => update({ photos })}
            max={4}
          />
          <p className="text-[11px] text-white/40">
            En fazla 4 fotoğraf. İlk fotoğraf ana fotoğrafındır.
          </p>
        </Section>

        <Section title="Astroloji" icon="🔮">
          <Field label="Doğum saati (yükselen burcun için)">
            <TextInput
              type="time"
              value={profile.birthTime ?? ""}
              onChange={(v) => update({ birthTime: v || undefined })}
              placeholder="örn. 14:30"
            />
          </Field>
          <Field label="Doğum yeri">
            <TextInput
              value={profile.birthPlace ?? ""}
              onChange={(v) => update({ birthPlace: v || undefined })}
              placeholder="örn. İstanbul"
            />
          </Field>
        </Section>

        <Section title="Hakkında" icon="📝">
          <Field label="Bio">
            <TextInput
              value={profile.bio ?? ""}
              onChange={(v) => update({ bio: v || undefined })}
              placeholder="Kendini birkaç kelimeyle anlat"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Boy (cm)">
              <TextInput
                type="number"
                value={profile.height ? String(profile.height) : ""}
                onChange={(v) => update({ height: v ? Number(v) : undefined })}
                placeholder="175"
              />
            </Field>
            <Field label="Meslek">
              <TextInput
                value={profile.job ?? ""}
                onChange={(v) => update({ job: v || undefined })}
                placeholder="örn. Tasarımcı"
              />
            </Field>
          </div>
          <Field label="Eğitim">
            <TextInput
              value={profile.education ?? ""}
              onChange={(v) => update({ education: v || undefined })}
              placeholder="örn. Boğaziçi Üniversitesi"
            />
          </Field>
          <Field label="Ne arıyorsun?">
            <ChipGroup
              options={RELATIONSHIP}
              value={profile.relationship}
              onChange={(v) => update({ relationship: v })}
            />
          </Field>
        </Section>

        <Section title="Yaşam tarzı" icon="🌿">
          <Field label="Sigara">
            <ChipGroup options={SMOKING} value={profile.smoking} onChange={(v) => update({ smoking: v })} />
          </Field>
          <Field label="Alkol">
            <ChipGroup options={DRINKING} value={profile.drinking} onChange={(v) => update({ drinking: v })} />
          </Field>
          <Field label="Spor">
            <ChipGroup options={EXERCISE} value={profile.exercise} onChange={(v) => update({ exercise: v })} />
          </Field>
          <Field label="Beslenme">
            <ChipGroup options={DIET} value={profile.diet} onChange={(v) => update({ diet: v })} />
          </Field>
        </Section>

        <Section title="Değerler" icon="⚖️">
          <Field label="Politik görüş">
            <ChipGroup options={POLITICS} value={profile.politics} onChange={(v) => update({ politics: v })} />
          </Field>
          <Field label="Din / maneviyat">
            <ChipGroup options={RELIGION} value={profile.religion} onChange={(v) => update({ religion: v })} />
          </Field>
          <Field label="Çocuk">
            <ChipGroup options={KIDS} value={profile.kids} onChange={(v) => update({ kids: v })} />
          </Field>
        </Section>

        <Section title="Hayvanlar" icon="🐾">
          <Field label="Kediler 🐱">
            <ChipGroup options={PET_ATTITUDE} value={profile.cats} onChange={(v) => update({ cats: v })} />
          </Field>
          <Field label="Köpekler 🐶">
            <ChipGroup options={PET_ATTITUDE} value={profile.dogs} onChange={(v) => update({ dogs: v })} />
          </Field>
        </Section>

        <Section title="Kişilik" icon="✨">
          <Field label="Sosyal enerji">
            <Slider
              value={profile.socialEnergy ?? 50}
              onChange={(v) => update({ socialEnergy: v })}
              left="İçe dönük"
              right="Dışa dönük"
            />
          </Field>
          <Field label="İlgi alanların (en fazla 8)">
            <ChipCloud
              options={INTERESTS}
              values={profile.interests ?? []}
              onChange={(v) => update({ interests: v })}
              max={8}
            />
          </Field>
        </Section>

        {/* Settings */}
        <Section title="Ayarlar" icon="⚙️">
          {auth.enabled &&
            (auth.isAnonymous ? (
              <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <p className="text-sm text-white/80">Hesabını kaydet</p>
                <p className="mt-0.5 text-xs text-white/50">
                  Google ile bağla → profilin ve eşleşmelerin tüm cihazlarında
                  seninle kalsın.
                </p>
                <button
                  onClick={() => linkGoogle()}
                  className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black active:scale-[0.98]"
                >
                  <span className="text-base">🔵</span> Google ile kaydet
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-400/20">
                ✓ {auth.email ?? "Google"} ile kayıtlı
              </div>
            ))}
          <button
            onClick={resetTaste}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-left text-sm ring-1 ring-white/10 active:bg-white/10"
          >
            🧭 Tarz Koçu verisini sıfırla
          </button>
          <button
            onClick={() => {
              if (confirm("Profilin silinecek ve baştan başlayacaksın. Emin misin?")) {
                clear();
              }
            }}
            className="w-full rounded-xl bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-300 ring-1 ring-rose-400/20 active:bg-rose-500/20"
          >
            🚪 Profili sıfırla / çıkış
          </button>
          <p className="px-1 pt-1 text-[11px] leading-relaxed text-white/40">
            Tüm karakterler ve yanıtlar yapay zekâdır. Amora 18 yaş ve üzeri
            içindir. Verilerin yalnızca bu cihazda saklanır.
          </p>
        </Section>
      </div>
    </div>
  );
}
