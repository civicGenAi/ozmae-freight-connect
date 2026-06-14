import { Truck } from "lucide-react";

/**
 * Lightweight, clean app loader.
 * Minimal DOM + pure-CSS animation (no heavy motion graphs) so it stays fast.
 */
export const LogisticsLoader = ({ message = "Loading..." }: { message?: string }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-white">
      {/* Brand mark with a quiet pulse */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-2xl bg-accent/10 animate-ping" />
        <div className="relative h-14 w-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
          <Truck className="h-7 w-7 text-accent-foreground" />
        </div>
      </div>

      {/* Slim progress track */}
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 rounded-full bg-accent animate-[loader-slide_1.1s_ease-in-out_infinite]" />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {message}
      </p>

      <style>{`
        @keyframes loader-slide {
          0%   { transform: translateX(-150%); }
          100% { transform: translateX(420%); }
        }
      `}</style>
    </div>
  );
};
