import { Request, Response } from "express";
import { medplum } from "../../../config/medplum";
import { errorResponse, sendResponse, successfullResponse } from "../../../utils/sendResponse";
import { ReasonPhrases } from "http-status-codes";
import { extractPaginationParams } from "../../../utils/helper";
import { body, validationResult } from "express-validator";
import { Questionnaire } from "@medplum/fhirtypes";

export async function getQuestionnaireList(req: Request, res: Response) {
    const pageParams = extractPaginationParams(req);
    const sort = req.query.sort;

    try {
        const page = await medplum.searchResources("Questionnaire", {
            _count: pageParams.limit,
            _offset: pageParams.offset,
            "subject-type": "Patient",
            _sort: sort ?? "-_lastUpdated",
            _total: "accurate",
        });

        sendResponse(
            res,
            successfullResponse({
                data: page,
                page: pageParams.page,
                limit: pageParams.limit,
                count: page.bundle.total,
            })
        );
    } catch (err) {
        console.error("An error occured while fetching list of questionnaires", err);
        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error));
    }
}
export async function getQuestionnaire(req: Request, res: Response) {
    const { questionnaireId } = req.params ?? {};
    try {
        const questionnaire = await medplum.readResource("Questionnaire", questionnaireId);
        sendResponse(res, successfullResponse(questionnaire));
    } catch (err) {
        console.error("An error occured while fetching questionnaire", err);
        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error));
    }
}
export const createQuestionnaireValidator = [
    body("name").isString().notEmpty(),
    body("title").isString().notEmpty(),
    body("description").isString().isLength({ max: 3000 }),
    body("status").optional().isString(),
    body("effectivePeriod.start")
        .optional()
        .custom((value, { req }) => {
            if (req.body.effectivePeriod && !value) {
                throw new Error("EffectivePeriod start is required when EffectivePeriod is present");
            }
            return true;
        })
        .isISO8601(),
    body("effectivePeriod.end")
        .optional()
        .custom((value, { req }) => {
            if (req.body.effectivePeriod && !value) {
                throw new Error("EffectivePeriod end is required when EffectivePeriod is present");
            }
            return true;
        })
        .isISO8601(),
    body("item").isArray(),
    body("item.*.linkId").isString().notEmpty(),
    body("item.*.prefix").isString().notEmpty(),
    body("item.*.type").isString().isIn(["string", "boolean", "integer", "decimal", "date", "choice"]),
    body("item.*.required").optional().isBoolean(),
    body("item.*.readOnly").optional().isBoolean(),
    body("item.*.maxLength").optional().isInt(),
    body("item.*.values").optional().isArray(),
    body("item.*.values.*.valueString").optional().isString().notEmpty(),
];
export async function createQuestionnaire(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error(errors);
        sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors));
        return;
    }

    const source = req.body ?? {};

    const data: Questionnaire = {
        resourceType: "Questionnaire",
        item: source.item ?? [],
        effectivePeriod: source.effectivePeriod ?? undefined,
        version: source.version,
        name: source.name,
        title: source.title,
        description: source.description,
        status: source.status,
        subjectType: source.subject ? [source.subject] : [],
    };

    try {
        const newQuestionnaire = await medplum.createResource(data);
        sendResponse(res, {
            data: newQuestionnaire,
            message: ReasonPhrases.CREATED,
            id: newQuestionnaire.id,
        });
    } catch (err) {
        console.error("An error occured while creating questionnaire", err);
        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error));
    }
}

export const updateQuestionnaireValidator = [
    body("id").isString().notEmpty(),
    body("resourceType").equals("Questionnaire").notEmpty(),
    body("version").isString().notEmpty(),
    body("name").isString().notEmpty(),
    body("title").isString().notEmpty(),
    body("description").isString().isLength({ max: 3000 }),
    body("status").optional().isString(),
    body("effectivePeriod.start")
        .custom((value, { req }) => {
            if (req.body.effectivePeriod && !value) {
                throw new Error("EffectivePeriod start is required when EffectivePeriod is present");
            }
            return true;
        })
        .isISO8601(),
    body("effectivePeriod.end")
        .custom((value, { req }) => {
            if (req.body.effectivePeriod && !value) {
                throw new Error("EffectivePeriod end is required when EffectivePeriod is present");
            }
            return true;
        })
        .isISO8601(),
    body("item").isArray(),
    body("item.*.linkId").isString().notEmpty(),
    body("item.*.prefix").isString().notEmpty(),
    body("item.*.type").isString().isIn(["string", "boolean", "integer", "decimal", "date"]),
    body("item.*.required").optional().isBoolean(),
    body("item.*.readOnly").optional().isBoolean(),
    body("item.*.maxLength").optional().isInt(),
    body("item.*.values").optional().isArray(),
    body("item.*.values.*.valueString").optional().isString().notEmpty(),
];
export async function updateQuestionnaire(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error(errors);
        sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors));
        return;
    }

    const source = req.body ?? {};
    const id = req.params.questionnaireId;

    const data: Questionnaire = {
        resourceType: "Questionnaire",
        item: source.item ?? [],
        effectivePeriod: source.effectivePeriod ?? undefined,
        version: source.version,
        name: source.name,
        title: source.title,
        description: source.description,
        id: id ?? source.id,
        status: source.status,
        subjectType: [source.subjectType],
        approvalDate: source.approvalDate,
        date: source.date ?? new Date().toISOString(),
    };

    try {
        const updatedQuestionnaire = await medplum.updateResource(data);
        sendResponse(res, {
            data: updatedQuestionnaire,
            message: ReasonPhrases.OK,
            id: updatedQuestionnaire.id,
        });
    } catch (err) {
        console.error("An error occured while updating questionnaire", err);
        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, err as Error));
    }
}
