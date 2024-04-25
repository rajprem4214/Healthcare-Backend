import { Router } from "express"
import { asyncWrap } from "../../../utils/asyncWrap"

import {
    createQuestionaireResponseHandler,
    createQuestionnaireResponseValidator,
    getAllQuestionnaireResponse,
    updateQuestionnaireResponseHandler,
    updateQuestionnaireResponseValidator,
} from "./questionnaireResponse"
import {
    createQuestionnaire,
    createQuestionnaireValidator,
    getQuestionnaire,
    getQuestionnaireList,
    updateQuestionnaire,
} from "./questionnaire"

const questionnaireRouter = Router()

// Keep these routes above limit since there is an interpretation issues of these paths due to get api /:questionnaireId
questionnaireRouter.get("/responses", asyncWrap(getAllQuestionnaireResponse))
questionnaireRouter.post(
    "/:questionnaireId/response",
    createQuestionnaireResponseValidator,
    asyncWrap(createQuestionaireResponseHandler)
)

// This is put method since we require the whole body to be resent in request and that is PUT standard.
questionnaireRouter.put(
    "/response/:questionnaireResponseId",
    updateQuestionnaireResponseValidator,
    asyncWrap(updateQuestionnaireResponseHandler)
)

// ---------------------------------------------------------------------------------------------------------
questionnaireRouter.get("/", asyncWrap(getQuestionnaireList))
questionnaireRouter.get("/:questionnaireId", asyncWrap(getQuestionnaire))

questionnaireRouter.post("/", createQuestionnaireValidator, asyncWrap(createQuestionnaire))

questionnaireRouter.put("/:questionnaireId", createQuestionnaireValidator, asyncWrap(updateQuestionnaire))

export { questionnaireRouter }
