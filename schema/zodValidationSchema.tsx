import { z } from "zod";

export const liveFlyerValidation = z.object({
  model: z.string().min(1).default(""), // If it's a date, use z.string().datetime()
  date: z.string().min(1).default(""),
  time: z.string().min(1).default(""),
  timezone: z.string().min(1).default(""),
  imageId: z.string().min(1).default(""),
  paid: z.boolean(),
});
