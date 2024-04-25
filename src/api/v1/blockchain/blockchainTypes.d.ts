declare type TransactionData = {
  transactionHash: string;
  gasUsed: string;
  status: string;
  [Key: string]: any;
};

declare type Log = {
  address: string;
  blockHash: string;
  blockNumber: string;
  data: string;
  logIndex: string;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: string;
};

declare type Transaction = {
  blockHash: string;
  blockNumber: string;
  cumulativeGasUsed: string;
  effectiveGasPrice: string;
  from: string;
  gasUsed: string;
  logs: Log[];
  logsBloom: string;
  status: string;
  to: string;
  transactionHash: string;
  transactionIndex: string;
  type: string;
};

declare type HealthIdApiResponse = Transaction & {
  patientID: string;
};
