import {
  MySqlTransaction,
  MySqlTransactionConfig,
} from 'drizzle-orm/mysql-core';
import { db } from '../../../config/database';
import { schema } from '../../../db';
import {
  PlanetScalePreparedQueryHKT,
  PlanetscaleQueryResultHKT,
} from 'drizzle-orm/planetscale-serverless';
import { InferModelFromColumns, InferSelectModel } from 'drizzle-orm';

export const logTransaction = async (
  transactionData: TransactionData,
  tx?: MySqlTransaction<
    PlanetscaleQueryResultHKT,
    PlanetScalePreparedQueryHKT,
    typeof schema
  >
) => {
  //
  const id = transactionData.transactionHash;
  const gasUsed = parseInt(transactionData.gasUsed ?? 0);
  const status = parseInt(transactionData.status);

  await (tx ?? db).insert(schema.onChainTransactions).values({
    id,
    gasUsed,
    transactionStatus: status,
    transactionData: JSON.stringify(transactionData),
  });
};
