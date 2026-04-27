import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Gauge,
  Loader2,
  Lock,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { loading: subLoading, premium } = useSubscription();
  const isLocked = !subLoading && !premium && !isAdmin;
  // True when the user can't play this audio for ANY reason (no premium OR
  // the day itself isn't unlocked yet in their journey). Used by the UI so
  // future days show a cadeado preview instead of trying to play.
  const effectivelyLocked = isLocked || dayLocked;

  const [audio, setAudio] = useState<DailyAudio | null>(null);
  const [dayLocked, setDayLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);
  const [buffering, setBuffering] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const completedRef = useRef(false);
  const lastSavedPosRef = useRef(0);
  const blobUrlRef = useRef<string | null>(null);
  const currentAudioRef = useRef<DailyAudio | null>(null);
  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeAtRef = useRef(0);
  const seekOperationRef = useRef(0);
  const signedUrlRef = useRef<string | null>(null);

  const requestedDay = Number(searchParams.get("day")) || currentDay;
  const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75];

  const showBufferingDebounced = () => {
    if (bufferingTimerRef.current) return;
    bufferingTimerRef.current = setTimeout(() => {
      setBuffering(true);
      bufferingTimerRef.current = null;
    }, 450);
  };

  const clearBuffering = () => {
    if (bufferingTimerRef.current) {
      clearTimeout(bufferingTimerRef.current);
      bufferingTimerRef.current = null;
    }
    setBuffering(false);
  };

  const revokeBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const safePlay = async (el: HTMLAudioElement) => {
    const p = el.play();
    if (p && typeof p.catch === "function") {
      await p.catch(() => {
        /* noop */
      });
    }
  };

  const persistProgressSnapshot = () => {
    const el = audioRef.current;
    const currentAudio = currentAudioRef.current;
    if (!el || !userId || !currentAudio) return;

    const pct = el.duration > 0 ? Math.min(100, (el.currentTime / el.duration) * 100) : 0;
    void supabase
      .from("audio_progress")
      .upsert(
        {
          user_id: userId,
          audio_id: currentAudio.id,
          day_number: currentAudio.day_number ?? requestedDay,
          progress_pct: pct,
          completed: completedRef.current,
          last_position_seconds: Math.floor(el.currentTime),
        },
        { onConflict: "user_id,audio_id" },
      )
      .then(() => {});
  };

  const getSignedUrlWithRetry = async (key: string) => {
    let signed: { url?: string } | null = null;
    let signedErr: unknown = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await supabase.functions.invoke("r2-get-audio-url", {
        body: { key },
      });

      if (!res.error && res.data?.url) {
        signed = res.data as { url: string };
        signedErr = null;
        break;
      }

      signedErr = res.error;
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
    }

    return { signed, signedErr };
  };

  // Playback rate intentionally always starts at 1x on page load to avoid
  // any mismatch between the selected speed chip and the actual audio rate.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setPlaying(false);
      setPosition(0);
      setDuration(0);
      setCompleted(false);
      completedRef.current = false;
      lastSavedPosRef.current = 0;
      resumeAtRef.current = 0;
      setSignedUrl(null);
      signedUrlRef.current = null;
      setSourceUrl(null);
      setCached(false);
      setDownloading(false);
      setDownloadPct(0);
      clearBuffering();
      revokeBlobUrl();

      const el = audioRef.current;
      if (el) {
        try {
          el.pause();
          el.removeAttribute("src");
          el.load();
        } catch {
          /* noop */
        }
      }

      if (!requestedDay || requestedDay < 1) {
        setAudio(null);
        currentAudioRef.current = null;
        setLoading(false);
        return;
      }

      setDayLocked(false);

      const { data } = await supabase
        .from("daily_audios")
        .select("id,title,subtitle,day_number,r2_key,description,prayer_text")
        .eq("day_number", requestedDay)
        .maybeSingle();

      if (cancelled) return;

      if (!data) {
        // RLS hides future days from non-admins. If the requested day is in
        // the future, fetch lightweight metadata via the safe RPC and render
        // a locked preview (title/subtitle only, no audio playback).
        if (!isAdmin && requestedDay > currentDay) {
          const { data: previewRows } = await supabase.rpc("get_week_preview", {
            _from_day: requestedDay,
            _to_day: requestedDay,
          });
          if (cancelled) return;
          const preview = (previewRows as Array<{ day_number: number; title: string; subtitle: string | null }> | null)?.[0];
          if (preview) {
            setAudio({
              id: `locked-${requestedDay}`,
              title: preview.title,
              subtitle: preview.subtitle,
              day_number: preview.day_number,
              r2_key: "",
              description: null,
              prayer_text: null,
            });
            currentAudioRef.current = null;
            setDayLocked(true);
            setLoading(false);
            return;
          }
        }
        setAudio(null);
        currentAudioRef.current = null;
        setLoading(false);
        return;
      }

      setAudio(data);
      currentAudioRef.current = data;

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

      // Non-premium users: show metadata only, never fetch the signed URL or download
      if (isLocked) {
        setLoading(false);
        return;
      }

      const { signed, signedErr } = await getSignedUrlWithRetry(data.r2_key);
      if (cancelled) return;

      if (signedErr || !signed?.url) {
        toast({
          title: "Couldn't load audio",
          description: "Please check your connection and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const url = signed.url as string;
      let initialSource = url;
      let alreadyCached = false;

      try {
        const audioIsCached = await isAudioCached(url);
        if (!cancelled && audioIsCached) {
          const cachedUrl = await getCachedAudioUrl(url);
          if (!cancelled && cachedUrl) {
            initialSource = cachedUrl;
            blobUrlRef.current = cachedUrl;
          }
          setCached(true);
          alreadyCached = true;
        }
      } catch {
        /* preview/iframe — caches API blocked */
      }

      if (!alreadyCached) {
        void downloadAudio(url)
          .then((ok) => {
            if (!cancelled && ok) setCached(true);
          })
          .catch(() => {
            /* silent */
          });
      }

      if (cancelled) return;

      resumeAtRef.current = resumeAt;
      signedUrlRef.current = url;
      setSignedUrl(url);
      setSourceUrl(initialSource);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
      persistProgressSnapshot();
    };
  }, [requestedDay, userId, isLocked, isAdmin, currentDay]);

  useEffect(() => {
    const el = audioRef.current;
    const current = audio;
    if (!el || !current || !sourceUrl) return;

    let cancelled = false;
    let retryAttempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stalledTimer: ReturnType<typeof setTimeout> | null = null;
    const MAX_RETRIES = 3;

    const cleanupTimers = () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (stalledTimer) clearTimeout(stalledTimer);
      retryTimer = null;
      stalledTimer = null;
    };

    const swapSource = async (nextSrc: string, resumePos: number, shouldResume: boolean) => {
      if (cancelled) return;

      clearBuffering();
      setPlaying(false);

      const onLoadedMetadata = () => {
        try {
          if (resumePos > 0 && el.duration > 0) {
            el.currentTime = Math.min(resumePos, Math.max(0, el.duration - 0.1));
          }
        } catch {
          /* noop */
        }
        setPosition(el.currentTime || 0);
        if (shouldResume) void safePlay(el);
      };

      el.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
      try {
        el.pause();
        el.src = nextSrc;
        el.load();
      } catch {
        el.removeEventListener("loadedmetadata", onLoadedMetadata);
      }
    };

    const attemptRecovery = async (reason: string) => {
      if (cancelled) return;
      if (retryAttempts >= MAX_RETRIES) {
        clearBuffering();
        setPlaying(false);
        toast({
          title: "Playback error",
          description: "We couldn't play this audio. Check your connection and try again.",
          variant: "destructive",
        });
        return;
      }

      retryAttempts += 1;
      const wasPlaying = !el.paused;
      const resumePos = el.currentTime || 0;
      console.warn(`[audio] recovery attempt ${retryAttempts} (${reason})`);

      try {
        const cachedUrl = signedUrlRef.current ? await getCachedAudioUrl(signedUrlRef.current) : null;
        if (cachedUrl && !cancelled && el.src !== cachedUrl) {
          revokeBlobUrl();
          blobUrlRef.current = cachedUrl;
          setCached(true);
          await swapSource(cachedUrl, resumePos, wasPlaying);
          return;
        }
      } catch {
        /* noop */
      }

      const backoff = 500 * Math.pow(2, retryAttempts - 1);
      retryTimer = setTimeout(async () => {
        if (cancelled) return;

        try {
          const { data: fresh, error: freshErr } = await supabase.functions.invoke("r2-get-audio-url", {
            body: { key: current.r2_key },
          });

          if (cancelled) return;

          if (freshErr || !fresh?.url) {
            void attemptRecovery("refresh-failed");
            return;
          }

          signedUrlRef.current = fresh.url as string;
          setSignedUrl(fresh.url as string);
          await swapSource(fresh.url as string, resumePos, wasPlaying);
        } catch {
          void attemptRecovery("network");
        }
      }, backoff);
    };

    const onLoadedMetadata = () => {
      setDuration(el.duration || 0);

      const resumeAt = resumeAtRef.current;
      if (resumeAt > 0 && el.duration > 0 && resumeAt < el.duration - 10) {
        try {
          el.currentTime = resumeAt;
        } catch {
          /* noop */
        }
        setPosition(resumeAt);
      } else {
        setPosition(el.currentTime || 0);
      }

      if (el.duration > 0 && Number.isFinite(el.duration)) {
        void supabase.rpc("set_audio_duration_if_missing", {
          _audio_id: current.id,
          _duration: Math.round(el.duration),
        });
      }
    };

    const onTimeUpdate = () => {
      setPosition(el.currentTime);
      if (!el.paused) clearBuffering();

      if (userId && el.currentTime - lastSavedPosRef.current >= 5) {
        lastSavedPosRef.current = el.currentTime;
        const livePct = el.duration > 0 ? Math.min(100, (el.currentTime / el.duration) * 100) : 0;
        void supabase
          .from("audio_progress")
          .upsert(
            {
              user_id: userId,
              audio_id: current.id,
              day_number: current.day_number ?? requestedDay,
              progress_pct: livePct,
              completed: completedRef.current,
              last_position_seconds: Math.floor(el.currentTime),
            },
            { onConflict: "user_id,audio_id" },
          )
          .then(() => {});
      }

      if (
        !completedRef.current &&
        userId &&
        el.duration > 0 &&
        el.currentTime / el.duration >= 0.9
      ) {
        completedRef.current = true;
        setCompleted(true);
        const pct = Math.min(100, (el.currentTime / el.duration) * 100);
        void supabase
          .from("audio_progress")
          .upsert(
            {
              user_id: userId,
              audio_id: current.id,
              day_number: current.day_number ?? requestedDay,
              progress_pct: pct,
              completed: true,
              completed_at: new Date().toISOString(),
              last_position_seconds: Math.floor(el.currentTime),
            },
            { onConflict: "user_id,audio_id" },
          )
          .then(() => refreshProgress());
      }
    };

    const onEnded = () => {
      setPlaying(false);
      setPosition(el.duration || 0);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    };

    const onPlay = () => {
      setPlaying(true);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    };

    const onPause = () => {
      setPlaying(false);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    };

    const onPlaying = () => {
      retryAttempts = 0;
      clearBuffering();
      if (stalledTimer) {
        clearTimeout(stalledTimer);
        stalledTimer = null;
      }
    };

    const onStalled = () => {
      showBufferingDebounced();
      if (stalledTimer) clearTimeout(stalledTimer);
      stalledTimer = setTimeout(() => {
        if (!el.paused && el.readyState < 3) void attemptRecovery("stalled-timeout");
      }, 8000);
    };

    const onWaiting = () => showBufferingDebounced();
    const onCanPlay = () => clearBuffering();
    const onSeeked = () => clearBuffering();
    const onError = () => {
      void attemptRecovery("error-event");
    };

    el.preload = "auto";
    // Apply current playback rate without listing it as a dep (avoids full reload on speed change)
    el.playbackRate = playbackRate;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("stalled", onStalled);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("seeked", onSeeked);
    el.addEventListener("error", onError);

    try {
      el.pause();
      el.src = sourceUrl;
      el.load();
    } catch {
      /* noop */
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.subtitle ?? "Solomon Wealth Code",
        album: `Day ${current.day_number ?? requestedDay}`,
        artwork: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      });
      try {
        navigator.mediaSession.setActionHandler("play", () => {
          void safePlay(el);
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          el.pause();
        });
        navigator.mediaSession.setActionHandler("seekbackward", (d) => {
          const offset = d.seekOffset ?? 10;
          const next = Math.max(0, el.currentTime - offset);
          const op = seekOperationRef.current + 1;
          seekOperationRef.current = op;
          el.pause();
          el.currentTime = next;
          setPosition(next);
          void safePlay(el);
        });
        navigator.mediaSession.setActionHandler("seekforward", (d) => {
          const offset = d.seekOffset ?? 10;
          const max = el.duration > 0 ? el.duration - 0.1 : 0;
          const next = Math.min(max, el.currentTime + offset);
          const op = seekOperationRef.current + 1;
          seekOperationRef.current = op;
          el.pause();
          el.currentTime = next;
          setPosition(next);
          void safePlay(el);
        });
        navigator.mediaSession.setActionHandler("seekto", (d) => {
          if (d.seekTime == null) return;
          el.currentTime = d.seekTime;
          setPosition(d.seekTime);
        });
      } catch {
        /* some browsers don't support all actions */
      }
    }

    return () => {
      cancelled = true;
      cleanupTimers();
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("stalled", onStalled);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("seeked", onSeeked);
      el.removeEventListener("error", onError);
      try {
        el.pause();
        el.removeAttribute("src");
        el.load();
      } catch {
        /* noop */
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
  }, [audio, sourceUrl, userId, requestedDay, refreshProgress, toast]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const el = audioRef.current;
      if (!el) return;
      if (!el.paused && el.readyState < 3) {
        try {
          el.load();
          void safePlay(el);
        } catch {
          /* noop */
        }
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const toggle = () => {
    if (isLocked) {
      navigate("/upgrade");
      return;
    }
    const el = audioRef.current;
    if (!el) return;

    if (playing) {
      el.pause();
      return;
    }

    if (el.readyState < 3) setBuffering(true);
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch((err) => {
        setBuffering(false);
        setPlaying(false);
        if (err?.name !== "AbortError" && err?.name !== "NotAllowedError") {
          toast({
            title: "Couldn't start playback",
            description: "Tap play again or refresh the page.",
            variant: "destructive",
          });
        }
      });
    }
  };

  const performSeek = (targetTime: number, shouldResume: boolean) => {
    const el = audioRef.current;
    if (!el) return;

    const op = seekOperationRef.current + 1;
    seekOperationRef.current = op;

    const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
    const maxTime = dur > 0 ? dur - 0.1 : 0;
    const target = Math.max(0, Math.min(maxTime, targetTime));

    clearBuffering();
    setPosition(target);
    setPlaying(false);
    lastSavedPosRef.current = target;

    try {
      el.pause();
    } catch {
      /* noop */
    }

    let settled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      el.removeEventListener("seeked", handleSeeked);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };

    const finish = () => {
      if (settled || seekOperationRef.current !== op) return;
      settled = true;
      try {
        el.currentTime = target;
      } catch {
        /* noop */
      }
      setPosition(target);
      setPlaying(false);
      if (shouldResume) void safePlay(el);
      cleanup();
    };

    const handleSeeked = () => finish();

    el.addEventListener("seeked", handleSeeked);

    try {
      el.currentTime = target;
    } catch {
      /* noop */
    }

    fallbackTimer = setTimeout(() => {
      try {
        if (seekOperationRef.current === op && Math.abs(el.currentTime - target) > 0.5) {
          el.currentTime = target;
        }
      } catch {
        /* noop */
      }
      finish();
    }, 220);
  };

  const seek = (delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    performSeek(el.currentTime + delta, !el.paused);
  };

  const restart = () => {
    performSeek(0, false);
  };

  const progress = duration ? Math.min(100, (position / duration) * 100) : 0;
  const remaining = Math.max(0, duration - position);

  const goDay = (d: number) => {
    if (d < 1) return;
    if (!isAdmin && d > currentDay) return;
    setSearchParams(d === currentDay ? {} : { day: String(d) });
  };

  return (
    <AppShell>
      <audio ref={audioRef} className="hidden" preload="auto" playsInline />

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
          <section className="glass-card mt-8 rounded-3xl p-6 animate-fade-in">
            <div className="text-center">
              <h2 className="font-display text-2xl text-foreground">{audio.title}</h2>
              {audio.subtitle && <p className="mt-1 text-sm text-muted-foreground">{audio.subtitle}</p>}
            </div>

            <div className="mt-6 flex items-center justify-center gap-10">
              <button
                aria-label="Rewind ten seconds"
                onClick={() => seek(-10)}
                className="relative text-primary transition-transform hover:scale-110 active:scale-95"
              >
                <RotateCcw className="h-9 w-9" strokeWidth={1.4} />
                <span className="absolute inset-0 flex items-center justify-center pt-1 text-[10px] font-semibold">10</span>
              </button>

              <button
                aria-label={isLocked ? "Unlock audio with Premium" : playing ? "Pause" : "Play"}
                onClick={toggle}
                disabled={!isLocked && !signedUrl}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40 transition-transform hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.4)" }}
              >
                {isLocked ? (
                  <Lock className="h-7 w-7" strokeWidth={1.8} />
                ) : !signedUrl || buffering ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : playing ? (
                  <Pause className="h-8 w-8 fill-primary" strokeWidth={0} />
                ) : (
                  <Play className="h-8 w-8 translate-x-0.5 fill-primary" strokeWidth={0} />
                )}
              </button>

              <button
                aria-label="Forward ten seconds"
                onClick={() => seek(10)}
                className="relative text-primary transition-transform hover:scale-110 active:scale-95"
              >
                <RotateCw className="h-9 w-9" strokeWidth={1.4} />
                <span className="absolute inset-0 flex items-center justify-center pt-1 text-[10px] font-semibold">10</span>
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <span className="font-mono text-xs text-foreground/85">{formatTime(position)}</span>
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
              <span className="font-mono text-xs text-foreground/85">-{formatTime(remaining)}</span>
            </div>

            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={restart}
                disabled={!signedUrl}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                aria-label="Restart audio from beginning"
              >
                <RefreshCw className="h-3 w-3" />
                Restart
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
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

          {audio.description && (
            <section className="glass-card mt-5 rounded-3xl p-6 animate-fade-in">
              <h3 className="font-display text-xl text-foreground">About</h3>
              <div className="mt-2 h-px w-12 bg-primary/70" />
              <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">{audio.description}</p>
            </section>
          )}

          {audio.prayer_text && (
            <section className="glass-card mt-5 rounded-3xl p-6 animate-fade-in">
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
