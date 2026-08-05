/**
 * Cities and Lagos neighbourhoods, shared by every screen that asks someone
 * where they live or work.
 *
 * These used to live inside Register.jsx. The Profile page now edits the same
 * fields, and two copies of this list would drift the moment one gained an area
 * the other lacked — leaving a member who picked "Sangotedo" at signup unable
 * to find it again when editing.
 */
export const CITIES = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Enugu', 'Benin City',
  'Accra', 'Nairobi', 'Cape Town', 'Dakar',
]

export const LAGOS_AREAS = [
  // ── Islands & Upscale ──
  'Victoria Island', 'Ikoyi', 'Lekki Phase 1', 'Lekki Phase 2', 'Lekki-Epe Expressway',
  'Ajah', 'Sangotedo', 'Chevron / Idado', 'Ikate', 'Osapa London', 'Abraham Adesanya',
  'Badore', 'Ibeju-Lekki', 'Eleko', 'Epe',
  // ── Mainland — Central ──
  'Yaba', 'Surulere', 'Ojuelegba', 'Ikeja', 'Maryland', 'Gbagada', 'Shomolu', 'Bariga',
  'Ketu', 'Ojota', 'Mile 12', 'Alapere', 'Magodo', 'Oregun', 'Omole', 'Agidingbi', 'Ogudu',
  // ── Mainland — West ──
  'Agege', 'Ogba', 'Ojodu Berger', 'Ifako-Ijaiye', 'Dopemu', 'Iyana Ipaja', 'Ipaja',
  'Egbeda', 'Idimu', 'Alimosho', 'Akowonjo', 'Isheri', 'Abule Egba', 'Meiran',
  // ── Mainland — East ──
  'Mushin', 'Oshodi', 'Isolo', 'Ejigbo', 'Ikotun', 'Mile 2', 'Amuwo-Odofin',
  'Festac Town', 'Satellite Town', 'Okota', 'Ilasamaja',
  // ── Lagos Island ──
  'Lagos Island', 'Lagos Mainland', 'Apapa', 'Badia', 'Ajegunle',
  // ── Outskirts ──
  'Badagry', 'Ikorodu', 'Ojo', 'Ijede', 'Agbowa',
].sort()
