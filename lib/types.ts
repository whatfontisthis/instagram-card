export type SourceType = "article" | "video";

export interface ExtractedContent {
  url: string;
  source_type: SourceType;
  title: string;
  text: string;
  og_image: string | null;
  site_name: string | null;
}

export interface BodyCardData {
  headline: string;
  body: string;
  key_term: string | null;
  gloss: string | null;
}

export interface CoverCardData {
  headline: string;
  subhead: string;
  source_label: string;
}

export interface TakeawayCardData {
  headline: string;
  body: string;
}

export interface PostData {
  source_url: string;
  source_type: SourceType;
  cover_image: string | null;
  cover: CoverCardData;
  body_cards: BodyCardData[];
  takeaway: TakeawayCardData;
}
