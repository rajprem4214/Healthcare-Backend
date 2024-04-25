import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { env } from '../config/env'

const accessKeyId = env.CLOUDFLARE_ACCESS_KEY_ID || '';
const secretAccessKey = env.CLOUDFLARE_SECRET_ACCESS_KEY || '';

const s3Config: S3ClientConfig = {
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    }
};

export const s3 = new S3Client(s3Config);