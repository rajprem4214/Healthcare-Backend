import { Request, Response } from "express"
import { medplum } from "../../../config/medplum"
import { errorResponse, sendResponse, successfullResponse } from "../../../utils/sendResponse"
import { ReasonPhrases } from "http-status-codes"
import { QuestionnaireResponse } from "@medplum/fhirtypes"
import { body, param, validationResult } from "express-validator"

export async function getAllQuestionnaireResponse(req: Request, res: Response) {
    const { questionnaireId, patientId } = req.query ?? {}

    try {
        const questionnaire = await medplum.searchResources("QuestionnaireResponse", {
            source: `Patient/${patientId}`,
            questionnaire: `Questionnaire/${questionnaireId}`,
            _sort:"-_lastUpdated"
        })
        sendResponse(res, successfullResponse(questionnaire))
    } catch (err) {
        console.error("An error occured while fetching questionnaire response", err)
        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error))
    }
}
export const createQuestionnaireResponseValidator = [
    body("patientId").exists().trim().isLength({min:1}).withMessage("Patient Id is required"),
    param("questionnaireId").exists().trim().isLength({min:1}).withMessage("Questionnaire Id is required"),
    body("answer").isArray({ min: 1 }),
    param("questionnaireId").custom(async (value, { req }) => {
        const questionnaire = await medplum.searchOne("Questionnaire", {
            _id: value,
        })
        if (questionnaire === undefined) {
            throw new Error("Questionnaire  not found")
        }
        req.body.questionnaire = questionnaire
    }),
]
export async function createQuestionaireResponseHandler(req: Request, res: Response) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        console.error(errors)
        sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors))
        return
    }
    const body = req.body ?? {}
    const questionnaireId = req.params?.questionnaireId ?? ""
    const patientId = req.body?.patientId ?? ""
    const baseResponse: QuestionnaireResponse = {
        resourceType: "QuestionnaireResponse",
        source: {
            reference: `Patient/${patientId}`,
            id: patientId,
            type: "Patient",
        },
        item: body.answer,
        questionnaire: `Questionnaire/${questionnaireId}`,
        authored: new Date().toISOString(),
        status: "completed",
        meta: {
            lastUpdated: new Date().toISOString(),
        },
    }
    try {
        const questionnaireResponse = await medplum.createResource<QuestionnaireResponse>(baseResponse)
        sendResponse(res, successfullResponse(questionnaireResponse))
    } catch (err) {
        console.error("An error occured while creating questionnaire response", err)
        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error))
    }
}
export const updateQuestionnaireResponseValidator = [
    body("patientId").exists().trim().isLength({min:1}).withMessage("Patient Id is required"),
    param("questionnaireResponseId").exists().trim().isLength({min:1}).withMessage("Questionnaire Response Id is required"),
    body("answer").isArray({ min: 1 }),
    param("questionnaireResponseId").custom(async (value, { req }) => {
        const questionnaireResp = await medplum.searchOne("QuestionnaireResponse", {
            _id: value,
            source: `Patient/${req.body?.patientId ?? ""}`,
        })
        if (questionnaireResp === undefined) {
            throw new Error("Questionnaire Response not found")
        }
        if (questionnaireResp.item?.length !== req.body?.answer?.length) {
            throw new Error("Partial answers found")
        }
        req.body.qResponse = questionnaireResp
    }),
]
export async function updateQuestionnaireResponseHandler(req: Request, res: Response) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        console.error(errors)
        sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors))
        return
    }
    const body = req.body ?? {}
    const questionnaireResponseId = req.params?.questionnaireResponseId ?? ""
    const originalResponse: QuestionnaireResponse = req.body?.qResponse ?? {}
    const baseResponse: QuestionnaireResponse = {
        resourceType: "QuestionnaireResponse",
        source: originalResponse.source,
        item: body.answer,
        id: questionnaireResponseId,
        questionnaire: originalResponse.questionnaire,
        authored: originalResponse.authored,
        status: "amended",
        meta: {
            lastUpdated: new Date().toISOString(),
        },
    }
    try {
        const questionnaireResponse = await medplum.updateResource<QuestionnaireResponse>(baseResponse)
        sendResponse(res, successfullResponse(questionnaireResponse))
    } catch (err) {
        console.error("An error occured while updating questionnaire response", err)
        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error))
    }
}
