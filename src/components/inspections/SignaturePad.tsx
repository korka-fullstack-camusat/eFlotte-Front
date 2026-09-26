import { useEffect, useRef } from "react";
import { Eraser } from "lucide-react";

/** Zone de signature au doigt / stylet / souris. Renvoie un PNG en data URL (ou "" une fois effacée). */
export default function SignaturePad({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    // Restaure une signature déjà faite (retour à cette étape)
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = value;
      dirty.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  };

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    dirty.current = true;
    onChange(e.currentTarget.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    onChange("");
  };

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none rounded-xl cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          role="img"
          aria-label="Zone de signature : signez avec le doigt ou la souris"
        />
        {!value && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Signez ici
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600"
      >
        <Eraser size={14} /> Effacer la signature
      </button>
    </div>
  );
}
