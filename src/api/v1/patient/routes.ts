import { Router } from "express"
import { asyncWrap } from "../../../utils/asyncWrap"
import {
    addPatientDetailsValidator,
    createPatientDetails,
    getAllPatients,
    getDetailsUploadedDocumentList,
    getPatientDetails,
    getPatientDetailsValidator,
    getVitalsHistory,
    getVitalsHistoryValidator,
} from "./patient"

const patientRouter = Router()

//This route is not used since add/update is done in post api
//patientRouter.patch("", patientUpdateValidators, asyncWrap(updatePatientHandler))
patientRouter.post("/details", addPatientDetailsValidator, asyncWrap(createPatientDetails))
patientRouter.get("/details", getPatientDetailsValidator, asyncWrap(getPatientDetails))
patientRouter.get("/details/vitals/history", getVitalsHistoryValidator, asyncWrap(getVitalsHistory))
patientRouter.get("/details/documents",  asyncWrap(getDetailsUploadedDocumentList))
patientRouter.get("/", asyncWrap(getAllPatients))

export { patientRouter }
