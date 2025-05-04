import { z } from "zod";

export const liveFlyerValidation = z.object({
  model: z.string().min(1).default(""), // If it's a date, use z.string().datetime()
  date: z.string().min(1).default(""),
  time: z.string().min(1).default(""),
  timezone: z.string().min(1).default(""),
  croppedImage: z.string().min(1).default(""),
  noOfTemplates: z.number().min(1).default(1),
});
