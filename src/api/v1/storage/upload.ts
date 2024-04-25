import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../../../config/cloudflare";
import { env } from "../../../config/env";
import { createHash, randomUUID } from "crypto";
import { db } from "../../../config/database";
import { schema } from "../../../db";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const uploadFile = async (
    fileName: string,
    documentType: string,
    fileContent: Uint8Array,
    fileLength: number,
    contentType: string,
    uploadedBy: string
) => {
    const bucketName = env.CLOUDFLARE_BUCKET_NAME;
    console.log(`Uploading File ${fileName} to bucket ${bucketName}`);

    const filePath = `${uploadedBy}/${documentType}/`;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filePath + fileName,
        Body: fileContent,
        ContentType: contentType,
    });

    try {
        const returnData = await s3.send(command);
        const md5Hash = createHash("md5").update(fileContent).digest("hex");

        const existingRecord = await db.query.uploadedFiles.findFirst({
            where(fields, operators) {
                return operators.eq(fields.fileSignature, md5Hash);
            },
        });

        const insertId = randomUUID()
        if (existingRecord) {
         await db
                .insert(schema.uploadedFiles)
                .values({
                    id: insertId,
                    storedFileUrl: filePath + fileName,
                    fileLength: fileLength,
                    mimeType: contentType,
                    fileName: fileName,
                    fileSignature: md5Hash,
                    accessControls: 'read',
                    uploadedBy: uploadedBy,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isDuplicate: true,
                    linkedWith: existingRecord.id,
                });
               
        } else {
           await db
                .insert(schema.uploadedFiles)
                .values({
                    id: insertId,
                    storedFileUrl: filePath + fileName,
                    fileLength: fileLength,
                    mimeType: contentType,
                    fileName: fileName,
                    fileSignature: md5Hash,
                    accessControls: 'read',
                    uploadedBy: uploadedBy,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isDuplicate: false,
                    linkedWith: null,
                });

               
        }

        console.log(
            `File ${fileName} uploaded to  bucket ${bucketName} uploadedby ${uploadedBy}`,
            returnData
        );
        return {
            id:insertId,
            url:filePath + fileName
        };
    } catch (error) {
        console.error(
            `Error uploading file ${fileName} to bucket ${bucketName}`,
            error
        );
        throw error
    }
};

export const getSignedUrlForFile = async (insertId: string) => {
    try {
        const record = await db.query.uploadedFiles.findFirst({
            where(fields, operators) {
                return operators.eq(fields.id, insertId);
            },
        });

        if (!record) {
            throw new Error(`File record with id ${insertId} not found`);
        }

        const { storedFileUrl } = record;

        const signedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
                Bucket: env.CLOUDFLARE_BUCKET_NAME,
                Key: storedFileUrl,
            }),
            { expiresIn: 3600 }
        );

        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        throw error;
    }
};
