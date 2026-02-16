"use client";

import { MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getCatastroPropertyUrl } from "@/lib/catastro/client";
import type { Property } from "@/types/database";

const TIPO_BIEN_LABEL: Record<string, string> = {
  UR: "Urbano",
  RU: "Rústico",
};

interface PropertyCatastroCardProps {
  property: Property;
  /** Si es true, se muestra en formato compacto (menos líneas). */
  compact?: boolean;
}

/**
 * Muestra toda la información disponible del Catastro para una propiedad
 * y un enlace a la Sede Electrónica del Catastro para ver el inmueble.
 */
const PropertyCatastroCard = ({
  property,
  compact = false,
}: PropertyCatastroCardProps) => {
  const raw = property.catastro_raw_data as Record<string, unknown> | null;
  const tipoBien =
    (raw?.tipo_bien as string) ?? null;
  const domicilioTributario = (raw?.domicilio_tributario as string) ?? null;
  const bloque = (raw?.bloque as string) ?? null;
  const escalera = (raw?.escalera as string) ?? null;
  const planta = (raw?.planta as string) ?? null;
  const puerta = (raw?.puerta as string) ?? null;
  const coeficiente = (raw?.coeficiente_participacion as number) ?? null;
  const numUnidades = (raw?.num_unidades_constructivas as number) ?? null;

  const direccion =
    property.catastro_direccion ||
    domicilioTributario ||
    "";
  const provincia = property.catastro_provincia ?? "";
  const municipio = property.catastro_municipio ?? "";
  const superficie = property.catastro_superficie;
  const uso = property.catastro_uso;
  const anio = property.catastro_anio_construccion;
  const refCat = property.referencia_catastral;

  const hasLocation =
    direccion || (provincia && municipio) || bloque || escalera || planta || puerta;
  const hasDetails =
    superficie != null ||
    uso ||
    anio != null ||
    tipoBien ||
    coeficiente != null ||
    numUnidades != null;

  const catastroUrl = refCat ? getCatastroPropertyUrl(refCat) : null;
  const showCard =
    property.catastro_consultado || (refCat && catastroUrl);

  const handleVerEnCatastro = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!refCat || !catastroUrl) return;
    const copyAndOpen = async () => {
      try {
        await navigator.clipboard.writeText(refCat);
      } catch {
        // ignore
      }
      window.open(catastroUrl, "_blank", "noopener,noreferrer");
      toast.info(
        "Referencia copiada. Pega (Ctrl+V) en el campo «Referencia Catastral» de la Sede."
      );
    };
    copyAndOpen();
  };

  if (!showCard) {
    return null;
  }

  const content = (
    <div
      className={`space-y-1 rounded bg-muted p-2 text-xs ${compact ? "space-y-0.5" : ""}`}
    >
      {hasLocation && (
        <p className="flex items-start gap-1">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {direccion && <span>{direccion}</span>}
            {municipio && (
              <span>
                {direccion ? ", " : ""}
                {municipio}
              </span>
            )}
            {provincia && (
              <span>{municipio || direccion ? ` (${provincia})` : provincia}</span>
            )}
            {!direccion && !municipio && !provincia && domicilioTributario && (
              <span>{domicilioTributario}</span>
            )}
          </span>
        </p>
      )}
      {(bloque || escalera || planta || puerta) && (
        <p className="text-muted-foreground">
          {[bloque && `Blq ${bloque}`, escalera && `Esc ${escalera}`, planta && `Planta ${planta}`, puerta && `Pta ${puerta}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {tipoBien && (
        <p>
          Tipo: <strong>{TIPO_BIEN_LABEL[tipoBien] ?? tipoBien}</strong>
        </p>
      )}
      {superficie != null && (
        <p>Superficie: {superficie} m²</p>
      )}
      {uso && <p>Uso: {uso}</p>}
      {anio != null && <p>Año construcción: {anio}</p>}
      {coeficiente != null && (
        <p>Coef. participación: {coeficiente}</p>
      )}
      {numUnidades != null && numUnidades > 0 && (
        <p>Unidades constructivas: {numUnidades}</p>
      )}
      {property.catastro_consultado &&
        tipoBien === "RU" &&
        superficie == null &&
        !direccion && (
          <p className="text-muted-foreground italic">
            Inmueble rústico: superficie construida y dirección no figuran en
            esta consulta. Ver ficha en Catastro para parcela y cultivos.
          </p>
        )}
      {catastroUrl && refCat && (
        <button
          type="button"
          onClick={handleVerEnCatastro}
          className="mt-2 inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:no-underline"
          aria-label={`Abrir Sede del Catastro y copiar referencia ${refCat}`}
        >
          <ExternalLink className="h-3 w-3" />
          Ver en Catastro
        </button>
      )}
    </div>
  );

  return content;
};

export default PropertyCatastroCard;
