import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface UseScrollLinkedHeaderOptions {
  /** Ein-/Ausfahren aktiv (nur < 1024 px; ab 1024 bleibt der Header fix). */
  enabled: boolean;
  /** Suche/Menü offen → Header bleibt ganz eingefahren (offset = 0). */
  pinned: boolean;
}

const FADE_HEIGHT = 28; // Höhe von .vc-header-fade – zählt nicht zur soliden Header-Höhe
const SNAP_MS = 340;
const REDUCED_MS = 150;
const SNAP_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SETTLE_MS = 120; // Fallback, falls `scrollend` nicht feuert
const FLING_DISTANCE = 48; // px
const FLING_WINDOW = 150; // ms

/**
 * Safari-artiges, scroll-gekoppeltes Ein-/Ausfahren des Headers.
 *
 * - H = gemessene Höhe des soliden Headers (Zeile 1 (+2), ohne Fade-Bereich).
 * - offset ∈ [0, H] folgt jedem Scroll-Delta (passive Listener + rAF), direkt
 *   auf transform/opacity angewendet (kein React-State pro Frame).
 * - Am Gesten-Ende (`scrollend` bzw. 120 ms ohne Scroll) rastet der Header ein:
 *   offset > H/2 → ausblenden, sonst einblenden; Snapping mit ~340 ms und
 *   cubic-bezier(0.32, 0.72, 0, 1) – nur beim Einrasten, nicht beim Scrollen.
 * - Schneller Wisch nach oben (> 48 px in ~150 ms) klappt sofort auf.
 * - Ganz oben (scrollY ≤ 0, auch iOS-Gummiband) ist offset = 0.
 * - `prefers-reduced-motion`: kein Mitwandern, nur binärer Opacity-Wechsel (150 ms).
 *
 * Next-ready: kein Zugriff auf window/document während des Renderns, Logik nur in
 * Effekten/Refs.
 */
export function useScrollLinkedHeader({ enabled, pinned }: UseScrollLinkedHeaderOptions): {
  wrapperRef: RefObject<HTMLDivElement | null>;
  isHidden: boolean;
} {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const optsRef = useRef({ enabled, pinned });
  optsRef.current = { enabled, pinned };
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  const stRef = useRef({
    offset: 0,
    height: 0,
    lastY: 0,
    raf: 0,
    settleTimer: 0,
    snapTimer: 0,
    moving: false,
    gestureDy: 0,
    gestureStart: 0,
    acc: 0,
  });

  // prefers-reduced-motion verfolgen
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // pinned/enabled-Wechsel: sofort zurücksetzen (Header bleibt sichtbar)
  useEffect(() => {
    if (!optsRef.current.pinned && optsRef.current.enabled) return;
    const el = wrapperRef.current;
    const st = stRef.current;
    st.offset = 0;
    st.acc = 0;
    st.gestureDy = 0;
    st.gestureStart = 0;
    if (st.settleTimer) {
      window.clearTimeout(st.settleTimer);
      st.settleTimer = 0;
    }
    if (st.snapTimer) {
      window.clearTimeout(st.snapTimer);
      st.snapTimer = 0;
    }
    st.moving = false;
    if (el) {
      el.classList.remove('vc-scroll-snap', 'vc-scroll-hidden');
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('will-change');
    }
    setIsHidden(false);
  }, [enabled, pinned]);

  // Scroll-gekoppelte Bewegung + Messung (einmalig verdrahtet)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof window === 'undefined') return;
    const st = stRef.current;
    st.lastY = window.scrollY || 0;

    let disposed = false;

    const cancelSettle = () => {
      if (st.settleTimer) {
        window.clearTimeout(st.settleTimer);
        st.settleTimer = 0;
      }
    };

    const rearmSettle = () => {
      cancelSettle();
      st.settleTimer = window.setTimeout(settle, SETTLE_MS);
    };

    const finishSnap = () => {
      cancelSettle();
      if (st.snapTimer) {
        window.clearTimeout(st.snapTimer);
        st.snapTimer = 0;
      }
      if (st.moving) {
        st.moving = false;
        el.classList.remove('vc-scroll-snap');
        el.style.removeProperty('will-change');
      }
    };

    const apply = () => {
      const h = st.height || 1;
      const off = Math.min(Math.max(0, st.offset), st.height);
      el.style.transform = off > 0 ? `translate3d(0, ${-off}px, 0)` : '';
      el.style.opacity = Math.max(0, 1 - off / h).toFixed(4);
      const hidden = st.height > 0 && off >= st.height;
      if (hidden !== el.classList.contains('vc-scroll-hidden')) {
        el.classList.toggle('vc-scroll-hidden', hidden);
        if (!disposed) setIsHidden(hidden);
      }
    };

    const snapTo = (target: number) => {
      cancelSettle();
      if (st.snapTimer) {
        window.clearTimeout(st.snapTimer);
        st.snapTimer = 0;
      }
      if (target === st.offset) {
        finishSnap();
        return;
      }
      st.offset = target;
      const dur = reducedRef.current ? REDUCED_MS : SNAP_MS;
      el.style.setProperty('--vc-snap-dur', `${dur}ms`);
      el.style.setProperty('--vc-snap-ease', SNAP_EASE);
      if (!st.moving) {
        st.moving = true;
        el.classList.add('vc-scroll-snap');
        el.style.setProperty('will-change', 'transform, opacity');
      }
      apply();
      st.snapTimer = window.setTimeout(finishSnap, dur + 100);
    };

    const settle = () => {
      if (!optsRef.current.enabled || optsRef.current.pinned) return;
      const target = st.offset > st.height / 2 ? st.height : 0;
      snapTo(target);
    };

    const onScrollEnd = () => {
      // Läuft noch ein Rahmen? Dann hat das Scroll-Ende den Versatz noch nicht
      // verarbeitet – warten und den Inaktivitäts-Timer neu aufziehen.
      if (st.raf) {
        rearmSettle();
        return;
      }
      settle();
    };

    const onScroll = () => {
      rearmSettle();
      if (st.raf) return;
      st.raf = requestAnimationFrame(() => {
        st.raf = 0;
        if (!optsRef.current.enabled || optsRef.current.pinned) return;

        const y = window.scrollY || 0;

        // Ganz oben (auch iOS-Gummiband): Header immer komplett sichtbar
        if (y <= 0) {
          st.lastY = 0;
          st.gestureDy = 0;
          if (st.offset !== 0) {
            st.offset = 0;
            apply();
          }
          return;
        }

        const dy = y - st.lastY;
        st.lastY = y;

        // Wisch-Velocity über ein gleitendes 150-ms-Fenster
        const now = performance.now();
        if (now - st.gestureStart > FLING_WINDOW || st.gestureStart === 0) {
          st.gestureDy = 0;
          st.gestureStart = now;
        }
        st.gestureDy += dy;

        // Schneller Wisch nach oben → sofort komplett einblenden
        if (st.gestureDy <= -FLING_DISTANCE) {
          st.gestureDy = 0;
          snapTo(0);
          return;
        }

        // prefers-reduced-motion: nur binärer Opacity-Wechsel (kein Mitwandern)
        if (reducedRef.current) {
          st.acc += dy;
          if (st.acc >= 24) {
            st.acc = 0;
            snapTo(st.height);
          } else if (st.acc <= -12) {
            st.acc = 0;
            snapTo(0);
          }
          return;
        }

        // Scroll-gekoppelt mitfahren
        const next = Math.min(Math.max(st.offset + dy, 0), st.height);
        if (next === st.offset) {
          rearmSettle();
          return;
        }
        st.offset = next;
        if (!st.moving) {
          st.moving = true;
          el.style.setProperty('will-change', 'transform, opacity');
        }
        apply();
        rearmSettle();
      });
    };

    const measure = () => {
      // Solide Höhe = Wurzel des Headers ohne Fade (Menü-Dialog ist fixed und misst nicht mit)
      const root = el.firstElementChild as HTMLElement | null;
      if (!root) return;
      st.height = Math.max(0, root.offsetHeight - FADE_HEIGHT);
      if (st.offset > st.height) st.offset = st.height;
      apply();
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', onScrollEnd, { passive: true });

    return () => {
      disposed = true;
      cancelSettle();
      if (st.snapTimer) window.clearTimeout(st.snapTimer);
      if (st.raf) cancelAnimationFrame(st.raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      ro.disconnect();
      el.classList.remove('vc-scroll-snap', 'vc-scroll-hidden');
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('will-change');
    };
  }, []);

  return { wrapperRef, isHidden };
}