import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const ConfidenceIndicator = ({
  confidence,
  showLabel = false,
  size = "sm",
}: ConfidenceIndicatorProps) => {
  const getColor = () => {
    if (confidence >= 0.9) return "bg-success";
    if (confidence >= 0.7) return "bg-warning";
    return "bg-destructive";
  };

  const getLabel = () => {
    if (confidence >= 0.9) return "Alta";
    if (confidence >= 0.7) return "Media";
    return "Baja";
  };

  const dotSize = size === "sm" ? "h-2 w-2" : "h-3 w-3";

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn("rounded-full", dotSize, getColor())}
        title={`Confianza: ${(confidence * 100).toFixed(0)}%`}
        aria-label={`Nivel de confianza: ${(confidence * 100).toFixed(0)}%`}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {getLabel()} ({(confidence * 100).toFixed(0)}%)
        </span>
      )}
    </div>
  );
};

export default ConfidenceIndicator;
