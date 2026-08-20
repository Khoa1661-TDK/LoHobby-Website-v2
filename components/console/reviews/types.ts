// components/console/reviews/types.ts
//
// Shared data shapes for the reviews & messages queues (board 15b).
// Presentational fixtures for now; the data layer implements these later.

export interface ReviewRow {
  id: string;
  author: string;
  rating: number;
  body: string;
}

export interface MessageRow {
  id: string;
  sender: string;
  subject: string;
  body: string;
}
