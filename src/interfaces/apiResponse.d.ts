import type { ReasonPhrases } from 'http-status-codes';

declare interface MessageResponse {
  message: ReasonPhrases;
  data?: any;
}

declare interface ErrorResponse extends MessageResponse {
  stack?: string;
  issue?: any;
}

export declare type ApiResponse = { id: any } & (
  | ErrorResponse
  | MessageResponse
);
