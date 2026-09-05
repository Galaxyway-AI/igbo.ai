import { z } from 'zod';
import { roles, collaboratorStatuses } from '../src/data/project';
const short = z.string().max(160).default('');
export const safeURL = z
  .string()
  .max(500)
  .refine(
    (v) =>
      !v ||
      (/^https?:\/\//.test(v) &&
        (() => {
          try {
            const u = new URL(v);
            return !u.username && !u.password;
          } catch {
            return false;
          }
        })()),
    'Use a valid http or https URL',
  )
  .default('');
const contact = {
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  organisation: short,
  message: z.string().min(20).max(4000),
  contact_consent: z.literal(true),
  privacy_consent: z.literal(true),
  'cf-turnstile-response': z.string().max(2048).optional(),
};
export const collaborationSchema = z.object({
  ...contact,
  role: short,
  country: z.string().max(100).default(''),
  website: safeURL,
  collaboration_type: z.string().refine((v) => roles.includes(v)),
  expertise: z.string().max(2000).default(''),
  dialect: short,
  research_interests: z.string().max(1000).default(''),
  resource_url: safeURL,
});
export const sponsorshipSchema = z.object({
  ...contact,
  organisation: z.string().min(2).max(160),
});
export const supporterSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email().max(254),
    amount: z.number().int().min(1).max(10000),
    public_consent: z.boolean().default(false),
    public_display_name: z.string().max(120).default(''),
    organisation: short,
    website: safeURL,
    display_amount: z.boolean().default(false),
    display_level: z.boolean().default(false),
    privacy_consent: z.literal(true),
    'cf-turnstile-response': z.string().max(2048).optional(),
  })
  .refine(
    (v) => !v.public_consent || v.public_display_name.length >= 2,
    'Please provide a public display name.',
  );
export function publicPreferences(data: z.infer<typeof supporterSchema>) {
  return {
    public_consent: data.public_consent ? 1 : 0,
    anonymous: data.public_consent ? 0 : 1,
    public_display_name: data.public_consent ? data.public_display_name : '',
    display_amount: data.public_consent && data.display_amount ? 1 : 0,
    display_level: data.public_consent && data.display_level ? 1 : 0,
  };
}
export const collaboratorUpdate = z.object({
  status: z.enum(collaboratorStatuses),
  tags: z.string().max(500).default(''),
  note: z.string().max(4000).default(''),
});
export const phaseStatuses = [
  'Planned',
  'Research',
  'Active Development',
  'Evaluation',
  'Released',
  'On Hold',
] as const;
export const phaseSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().min(10).max(3000),
  status: z.enum(phaseStatuses),
  sort_order: z.number().int().min(0).max(100),
  target_date: z.string().date().nullable().default(null),
  start_date: z.string().date().nullable().default(null),
  related_url: safeURL,
  milestones: z
    .array(
      z.object({
        title: z.string().min(2).max(200),
        status: z.enum(phaseStatuses),
      }),
    )
    .max(50)
    .default([]),
});
export const updateSchema = z.object({
  title: z.string().min(3).max(160),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(160),
  summary: z.string().min(10).max(500),
  content: z.string().min(20).max(50000),
  status: z.enum(['Draft', 'Published']),
  author_organisation: short,
  related_url: safeURL,
  seo_description: z.string().max(300).default(''),
});
export const resourceSchema = z.object({
  title: z.string().min(2).max(160),
  summary: z.string().min(10).max(1000),
  url: safeURL.refine((v) => v.length > 0),
  category: short,
  licence: short,
  doi: short,
  status: z.enum(['Draft', 'Published']),
});
export const campaignSchema = z.object({
  title: z.string().min(2).max(160),
  summary: z.string().min(10).max(2000),
  target_minor: z.number().int().positive().nullable().default(null),
  verified_total_minor: z.number().int().nonnegative().nullable().default(null),
  currency: z.literal('GBP').default('GBP'),
  status: z.enum(['Draft', 'Published']),
});
export const organisationSchema = z
  .object({
    title: z.string().min(2).max(160),
    summary: z.string().max(2000),
    url: safeURL,
    logo_url: safeURL,
    status: z.enum(['Draft', 'Published']),
    relationship_confirmed: z.boolean(),
  })
  .refine(
    (v) => v.status !== 'Published' || v.relationship_confirmed,
    'Confirm the relationship before publishing.',
  );
export function escapeHTML(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
}
