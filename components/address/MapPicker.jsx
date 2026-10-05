"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { FaCrosshairs, FaMapMarkerAlt } from "react-icons/fa";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_CENTER = [35.6892, 51.389]; // تهران
const DEFAULT_ZOOM = 12;
const PIN_ZOOM = 16;

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/**
 * انتخاب موقعیت روی نقشه. لیفلت فقط سمت مرورگر کار می‌کنه، پس همه‌چیز توی useEffect ساخته می‌شه
 * (این فایل با next/dynamic و ssr:false لود می‌شه).
 */
export default function MapPicker({ value, onChange, onLocateStart, onLocateEnd, autoLocate = false }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onLocateEndRef = useRef(onLocateEnd);
  const autoLocateFiredRef = useRef(false);
  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
    onLocateEndRef.current = onLocateEnd;
  }, [onChange, onLocateEnd]);

  useEffect(() => {
    let cancelled = false;
    let map;

    import("leaflet").then((L) => {
      if (cancelled || !mapElRef.current || mapRef.current) return;

      // آیکن پیش‌فرض لیفلت مسیر تصویرش رو از bundler می‌خواد که با webpack/turbopack کار نمی‌کنه؛ SVG خودمون رو می‌سازیم
      const icon = L.divIcon({
        className: "",
        html: `<div style="transform:translateY(-100%)">
          <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 27 17 27s17-14.3 17-27C34 7.6 26.4 0 17 0z" style="fill:var(--color-green-600)"/>
            <circle cx="17" cy="17" r="7" fill="#fff"/>
          </svg>
        </div>`,
        iconSize: [34, 44],
        iconAnchor: [17, 44],
      });

      const start = value?.lat != null ? [value.lat, value.lng] : DEFAULT_CENTER;
      map = L.map(mapElRef.current, {
        center: start,
        zoom: value?.lat != null ? PIN_ZOOM : DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

      const marker = L.marker(start, { icon, draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onChangeRef.current({ lat, lng });
      });
      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locateMe() {
    if (!navigator.geolocation) {
      onLocateEndRef.current?.(false);
      return;
    }
    setLocating(true);
    onLocateStart?.();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        markerRef.current?.setLatLng([lat, lng]);
        mapRef.current?.setView([lat, lng], PIN_ZOOM);
        onChangeRef.current({ lat, lng });
        setLocating(false);
        onLocateEndRef.current?.(true);
      },
      () => {
        setLocating(false);
        onLocateEndRef.current?.(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  // اگه از بیرون خواسته شده بود، همین که نقشه آماده شد یه‌بار خودکار موقعیت کاربر رو بگیر
  // (برای حالت «موقعیت مکانی» که کاربر از قبل اجازه داده)
  useEffect(() => {
    if (ready && autoLocate && !autoLocateFiredRef.current) {
      autoLocateFiredRef.current = true;
      locateMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, autoLocate]);

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-xl border border-slate-200">
      <div ref={mapElRef} className="h-64 w-full sm:h-80" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-xs text-slate-400">
          در حال بارگذاری نقشه...
        </div>
      )}
      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "absolute bottom-3 left-3 flex shadow-sm")}
      >
        <FaCrosshairs className={locating ? "animate-spin text-green-700" : "text-green-700"} size={14} />
        {locating ? "در حال یافتن موقعیت..." : "موقعیت من"}
      </button>
      {value?.lat != null && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs text-slate-600 shadow-sm">
          <FaMapMarkerAlt className="text-green-700" size={12} />
          روی نقشه لمس کنید تا موقعیت تغییر کند
        </div>
      )}
    </div>
  );
}
