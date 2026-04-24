import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Gauge,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  downloadAudio,
  getCachedAudioUrl,
  isAudioCached,
  removeCachedAudio,
} from "@/lib/audioOffline";
import { isPreviewOrIframe } from "@/lib/pwa";

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

interface DailyAudio {
  id: string;
  title: string;
  subtitle: string | null;
  day_number: number | null;
  r2_key: string;
  description: string | null;
  prayer_text: string | null;
}

const Audio = () => {
  const { user, isAdmin } = useAuth();
  const userId = user?.id ?? null;
  const { currentDay, refresh: refreshProgress } = useProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [audio, setAudio] = useState<DailyAudio | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);
  const completedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSavedPosRef = useRef(0);
  const blobUrlRef = useRef<string | null>(null);

  const requestedDay = Number(searchParams.get("day")) || currentDay;

  const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75];

  // Restore preferred speed
  useEffect(() => {
    const stored = Number(localStorage.getItem("swc:audio:rate") || "1");
    if (SPEED_OPTIONS.includes(stored)) setPlaybackRate(stored);
  }, []);

  // Apply rate to element when it changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
    localStorage.setItem("swc:audio:rate", String(playbackRate));
  }, [playbackRate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only show the full skeleton on the very first load. When switching
      // days the previous player UI stays visible until the new one is ready,
      // avoiding a jarring flash to skeleton between days.
      setPlaying(false);
      setPosition(0);
      setDuration(0);
      setCompleted(false);
      completedRef.current = false;
      lastSavedPosRef.current = 0;
      setSignedUrl(null);
      setCached(false);
      setDownloading(false);
      setDownloadPct(0);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      audioRef.current?.pause();
      audioRef.current = null;

      if (!requestedDay || requestedDay < 1) { setLoading(false); return; }

      const { data } = await supabase
        .from("daily_audios")
        .select("id,title,subtitle,day_number,r2_key,description,prayer_text")
        .eq("day_number", requestedDay)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setAudio(data);
        // Show the player UI immediately — don't keep the skeleton up
        // while the signed URL / progress fetch round-trip completes.
        setLoading(false);
        // load existing progress
        let resumeAt = 0;
        if (userId) {
          const { data: prog } = await supabase
            .from("audio_progress")
            .select("completed,last_position_seconds")
            .eq("user_id", userId)
            .eq("audio_id", data.id)
            .maybeSingle();
          if (cancelled) return;
          if (prog?.completed) {
            setCompleted(true);
            completedRef.current = true;
          }
          if (prog?.last_position_seconds && prog.last_position_seconds > 5) {
            resumeAt = prog.last_position_seconds;
          }
        }
        const { data: signed } = await supabase.functions.invoke("r2-get-audio-url", {
          body: { key: data.r2_key },
        });
        if (!cancelled && signed?.url) {
          const url = signed.url as string;
          setSignedUrl(url);

          // Prefer cached blob if available (offline-first)
          let playableUrl = url;
          let alreadyCached = false;
          try {
            const isCached = await isAudioCached(url);
            if (isCached) {
              const blobUrl = await getCachedAudioUrl(url);
              if (blobUrl) {
                playableUrl = blobUrl;
                blobUrlRef.current = blobUrl;
              }
              setCached(true);
              alreadyCached = true;
            }
          } catch {
            /* preview/iframe — caches API blocked */
          }

          // Auto-cache in background for instant replays next time.
          if (!alreadyCached) {
            void downloadAudio(url).then((ok) => {
              if (!cancelled && ok) setCached(true);
            }).catch(() => { /* silent */ });
          }

          const el = new window.Audio(playableUrl);
          el.preload = "metadata";
          el.playbackRate = playbackRate;
          el.addEventListener("loadedmetadata", () => {
            setDuration(el.duration);
            // Resume from last saved position (#11), avoid jumping to the very end.
            if (resumeAt > 0 && el.duration > 0 && resumeAt < el.duration - 10) {
              el.currentTime = resumeAt;
              setPosition(resumeAt);
            }
          });
          el.addEventListener("timeupdate", () => {
            setPosition(el.currentTime);

            // Persist position every ~5s for resume next session.
            if (
              userId &&
              data &&
              el.currentTime - lastSavedPosRef.current >= 5
            ) {
              lastSavedPosRef.current = el.currentTime;
              const livePct = el.duration > 0
                ? Math.min(100, (el.currentTime / el.duration) * 100)
                : 0;
              supabase
                .from("audio_progress")
                .upsert(
                  {
                    user_id: userId,
                    audio_id: data.id,
                    day_number: data.day_number ?? requestedDay,
                    progress_pct: livePct,
                    completed: completedRef.current,
                    last_position_seconds: Math.floor(el.currentTime),
                  },
                  { onConflict: "user_id,audio_id" },
                )
                .then(() => {});
            }

            // mark complete at >=90%
            if (
              !completedRef.current &&
              userId &&
              data &&
              el.duration > 0 &&
              el.currentTime / el.duration >= 0.9
            ) {
              completedRef.current = true;
              setCompleted(true);
              const pct = Math.min(100, (el.currentTime / el.duration) * 100);
              supabase
                .from("audio_progress")
                .upsert(
                  {
                    user_id: userId,
                    audio_id: data.id,
                    day_number: data.day_number ?? requestedDay,
                    progress_pct: pct,
                    completed: true,
                    completed_at: new Date().toISOString(),
                    last_position_seconds: Math.floor(el.currentTime),
                  },
                  { onConflict: "user_id,audio_id" }
                )
                .then(() => refreshProgress());
            }
          });
          el.addEventListener("ended", () => {
            setPlaying(false);
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
          });
          el.addEventListener("play", () => {
            setPlaying(true);
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          });
          el.addEventListener("pause", () => {
            setPlaying(false);
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
          });
          audioRef.current = el;

          // Media Session API (lockscreen / hardware controls) — #12
          if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: data.title,
              artist: data.subtitle ?? "Solomon Wealth Code",
              album: `Day ${data.day_number ?? requestedDay}`,
              artwork: [
                { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
                { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
              ],
            });
            try {
              navigator.mediaSession.setActionHandler("play", () => el.play());
              navigator.mediaSession.setActionHandler("pause", () => el.pause());
              navigator.mediaSession.setActionHandler("seekbackward", (d) => {
                el.currentTime = Math.max(0, el.currentTime - (d.seekOffset ?? 10));
              });
              navigator.mediaSession.setActionHandler("seekforward", (d) => {
                el.currentTime = Math.min(el.duration || 0, el.currentTime + (d.seekOffset ?? 10));
              });
              navigator.mediaSession.setActionHandler("seekto", (d) => {
                if (d.seekTime != null) el.currentTime = d.seekTime;
              });
            } catch {
              /* some browsers don't support all actions */
            }
          }
        }
      } else {
        setAudio(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      // Persist final position so resume works even if the user just navigated away.
      const el = audioRef.current;
      if (el && userId && audio) {
        const pct = el.duration > 0
          ? Math.min(100, (el.currentTime / el.duration) * 100)
          : 0;
        supabase
          .from("audio_progress")
          .upsert(
            {
              user_id: userId,
              audio_id: audio.id,
              day_number: audio.day_number ?? requestedDay,
              progress_pct: pct,
              completed: completedRef.current,
              last_position_seconds: Math.floor(el.currentTime),
            },
            { onConflict: "user_id,audio_id" },
          )
          .then(() => {});
      }
      audioRef.current?.pause();
      audioRef.current = null;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if ("mediaSession" in navigator) {
        try {
          (["play", "pause", "seekbackward", "seekforward", "seekto"] as MediaSessionAction[]).forEach(
            (a) => navigator.mediaSession.setActionHandler(a, null),
          );
        } catch {
          /* noop */
        }
      }
    };
  }, [requestedDay, userId]);

  const toggle = () => {
    if (!audioRef.current) return;
    // The element's own play/pause listeners will sync `playing` state.
    if (playing) audioRef.current.pause();
    else void audioRef.current.play();
  };
  const seek = (delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
  };

  const progress = duration ? (position / duration) * 100 : 0;
  const remaining = Math.max(0, duration - position);

  const goDay = (d: number) => {
    if (d < 1) return;
    if (!isAdmin && d > currentDay) return;
    setSearchParams(d === currentDay ? {} : { day: String(d) });
  };

  return (
    <AppShell>
      <header className="text-center animate-fade-up">
        <div className="flex items-center justify-between">
          <button
            onClick={() => goDay(requestedDay - 1)}
            disabled={requestedDay <= 1}
            className="rounded-full p-2 text-foreground/80 disabled:opacity-30 hover:text-primary"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-foreground">Day {requestedDay}</h1>
            {requestedDay !== currentDay && (
              <button onClick={() => goDay(currentDay)} className="text-[10px] uppercase tracking-[0.18em] text-primary">
                Back to today
              </button>
            )}
            {requestedDay === currentDay && (
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Today</p>
            )}
          </div>
          <button
            onClick={() => goDay(requestedDay + 1)}
            disabled={!isAdmin && requestedDay >= currentDay}
            className="rounded-full p-2 text-foreground/80 disabled:opacity-30 hover:text-primary"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        {completed && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/40">
            <Check className="h-3 w-3" /> Completed
          </div>
        )}
      </header>

      {loading && (
        <div className="mt-8 space-y-5" aria-label="Loading audio">
          <div className="glass-card rounded-3xl p-6">
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="mx-auto mt-2 h-4 w-32" />
            <div className="mt-6 flex items-center justify-center gap-10">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
            <Skeleton className="mt-6 h-1.5 w-full rounded-full" />
          </div>
          <div className="glass-card rounded-3xl p-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-11/12" />
            <Skeleton className="mt-2 h-3 w-3/4" />
          </div>
        </div>
      )}

      {!loading && !audio && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No audio available yet. Check back soon.
        </p>
      )}

      {audio && (
      <>
      {/* Player card */}
      <section
        className="glass-card mt-8 rounded-3xl p-6 animate-fade-up"
        style={{ animationDelay: "80ms" }}
      >
        <div className="text-center">
          <h2 className="font-display text-2xl text-foreground">{audio.title}</h2>
          {audio.subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{audio.subtitle}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-10">
          <button
            aria-label="Rewind ten seconds"
            onClick={() => seek(-10)}
            className="relative text-primary transition-transform hover:scale-110 active:scale-95"
          >
            <RotateCcw className="h-9 w-9" strokeWidth={1.4} />
            <span className="absolute inset-0 flex items-center justify-center pt-1 text-[10px] font-semibold">
              10
            </span>
          </button>

          <button
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
            disabled={!signedUrl}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-wait"
            style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.4)" }}
          >
            {!signedUrl ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : playing ? (
              <Pause className="h-8 w-8 fill-primary" strokeWidth={0} />
            ) : (
              <Play className="h-8 w-8 fill-primary translate-x-0.5" strokeWidth={0} />
            )}
          </button>

          <button
            aria-label="Forward ten seconds"
            onClick={() => seek(10)}
            className="relative text-primary transition-transform hover:scale-110 active:scale-95"
          >
            <RotateCw className="h-9 w-9" strokeWidth={1.4} />
            <span className="absolute inset-0 flex items-center justify-center pt-1 text-[10px] font-semibold">
              10
            </span>
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="font-mono text-xs text-foreground/85">
            {formatTime(position)}
          </span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/15">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{
                width: `${progress}%`,
                boxShadow: "0 0 10px hsl(var(--primary) / 0.7)",
              }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
              style={{ left: `calc(${progress}% - 0.5rem)` }}
            />
          </div>
          <span className="font-mono text-xs text-foreground/85">
            -{formatTime(remaining)}
          </span>
        </div>

        {/* Speed + Offline controls (#10, #13) */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Gauge className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
            <div className="flex flex-wrap gap-1">
              {SPEED_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  aria-pressed={playbackRate === rate}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    playbackRate === rate
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                      : "bg-foreground/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {!isPreviewOrIframe() && signedUrl && (
            cached ? (
              <button
                type="button"
                onClick={async () => {
                  if (!signedUrl) return;
                  await removeCachedAudio(signedUrl);
                  setCached(false);
                  toast({ title: "Removed from device" });
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/40"
                aria-label="Remove offline copy"
              >
                <Trash2 className="h-3 w-3" />
                Saved
              </button>
            ) : downloading ? (
              <div className="flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {Math.round(downloadPct * 100)}%
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  if (!signedUrl) return;
                  setDownloading(true);
                  setDownloadPct(0);
                  const ok = await downloadAudio(signedUrl, setDownloadPct);
                  setDownloading(false);
                  if (ok) {
                    setCached(true);
                    toast({ title: "Saved for offline" });
                  } else {
                    toast({ title: "Couldn't save offline", variant: "destructive" });
                  }
                }}
                className="flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                aria-label="Save for offline"
              >
                <Download className="h-3 w-3" />
                Save offline
              </button>
            )
          )}
        </div>
      </section>

      {/* Description */}
      {audio.description && (
        <section className="glass-card mt-5 rounded-3xl p-6 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <h3 className="font-display text-xl text-foreground">About</h3>
          <div className="mt-2 h-px w-12 bg-primary/70" />
          <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">
            {audio.description}
          </p>
        </section>
      )}

      {/* Prayer */}
      {audio.prayer_text && (
        <section className="glass-card mt-5 rounded-3xl p-6 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-display text-xl text-foreground">Prayer</h3>
          <div className="mt-2 h-px w-12 bg-primary/70" />
          <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">{audio.prayer_text}</p>
        </section>
      )}
      </>
      )}
    </AppShell>
  );
};

export default Audio;
