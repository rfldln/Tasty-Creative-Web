import { z } from "zod";

export const liveFlyerValidation = z.object({
  model: z.string().min(1).default(""), // If it's a date, use z.string().datetime()
  date: z.string().min(1).default(""),
  time: z.string().min(1).default(""),
  timezone: z.string().min(1).default(""),
  croppedImage: z.string().min(1).default(""),
  noOfTemplates: z.number().min(1).default(1),
});

export const vipFlyerValidation = z.object({
  model: z.string().min(1).default(""), // If it's a date, use z.string().datetime()
  croppedImage: z.string().min(1).default(""),
  templatePosition: z.string().min(1).default(""),
});


export const fttFlyerValidation = z.object({
  model: z.string().min(1).default(""), // If it's a date, use z.string().datetime()
  croppedImage: z.string().min(1).default(""),
  // templatePosition: z.string().min(1).default(""),
  tip: z.number().min(1).default(10),
  get: z.number().min(1).default(100),
});
