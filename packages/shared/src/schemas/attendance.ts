import { z } from "zod";
import { optional } from "./_helpers.js";

export const attendanceActionSchema = z.object({
  notes: optional(z.string()),
});
export type AttendanceActionInput = z.infer<typeof attendanceActionSchema>;
