import { Request, Response } from 'express';
import {
  errorResponse,
  sendResponse,
  successfullResponse,
} from '../../../utils/sendResponse';
import { ReasonPhrases } from 'http-status-codes';
import { validationResult } from 'express-validator';
import { getSignedUrlForFile, uploadFile } from './upload';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export const uploadFileHandler = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(
        res,
        errorResponse(ReasonPhrases.UNPROCESSABLE_ENTITY, errors)
      );
    }

    const currentUser = req.body.currentUser.id;
    const uploadMiddleware = upload.single('file');

    uploadMiddleware(req, res, async function (err: any) {
      if (err) {
        return sendResponse(
          res,
          errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err)
        );
      }

      if (!req.file) {
        return sendResponse(
          res,
          errorResponse(ReasonPhrases.UNSUPPORTED_MEDIA_TYPE, err)
        );
      }

      const { originalname, buffer, size, mimetype } = req.file;
      const documentType = req.body.documentType;

      const storedData = await uploadFile(
        originalname,
        documentType,
        buffer,
        size,
        mimetype,
        currentUser
      );

      sendResponse(
        res,
        successfullResponse({
          message: 'File uploaded successfully',
          data: storedData,
        })
      );
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
    );
  }
};

export const getSignedUrlHandler = async (req: Request, res: Response) => {
  try {
    const insertId = req.params.insertId;

    const signedUrl = await getSignedUrlForFile(insertId);

    sendResponse(
      res,
      successfullResponse({
        message: 'Signed URL generated successfully',
        signedUrl,
      })
    );
  } catch (error) {
    console.error('Error generating signed URL:', error);
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
    );
  }
};