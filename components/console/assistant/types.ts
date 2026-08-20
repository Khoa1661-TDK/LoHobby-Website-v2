// components/console/assistant/types.ts
//
// Assistant panel data shapes. Presentational fixtures for now; the data
// layer will implement these later.

export interface AssistantProposal {
  action: string;
  scope: string;
  before: string;
  after: string;
  note: string;
}
