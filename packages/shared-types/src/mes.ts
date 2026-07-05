import { z } from "zod";

/** 'YYYY-MM' — validated calendar-month string used everywhere instead of Date objects. */
export const MesReferenciaSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato esperado: YYYY-MM");

export type MesReferencia = z.infer<typeof MesReferenciaSchema>;
