import { Request, Response } from "express";
import { errorResponse, sendResponse, successfullResponse } from "../../../utils/sendResponse";
import { ReasonPhrases } from "http-status-codes";
import { AbbyMeasurment } from "./abby.type";
import { db } from "../../../config/database";
import { medplum } from "../../../config/medplum";
import {
    PatientDetails,
    PatientDetailsTopic,
    PatientMeasurment,
    PatientVital,
} from "../patient/patientTypes";
import { DeepPartial } from "../../../interfaces/utils";
import {
    combineObsComponents,
    convergeArrayObs,
    getMultiObservationforPatientDetails,
} from "../patient/patientDetails";

export const addAbbyMeasurment = async (req: Request, res: Response) => {
    const body = req.body ?? {};

    if (Object.keys(body).length === 0) {
        sendResponse(res, errorResponse(ReasonPhrases.BAD_REQUEST, new Error("Empty data")));
        return;
    }

    const measurmentData: AbbyMeasurment = body;

    if (!measurmentData.EmailAddress) {
        sendResponse(res, errorResponse(ReasonPhrases.BAD_REQUEST, new Error("Email address is missing")));
        return;
    }

    const measurement: Partial<PatientMeasurment> = {
        bmi: measurmentData.BMI,
        fatPct: measurmentData.BodyFat,
        bmrKcal: measurmentData.BMR_kcal,
        dKcal: measurmentData.DCI_kcal,
        height: measurmentData.Height,
        weightInKg: measurmentData.Weight,
        temprature: measurmentData.Temperature,
    };

    const vital: Partial<PatientVital> = {
        bodyFatInKg: measurmentData.BodyFatMass,
        bodyWaterInKg: measurmentData.BodyWaterMass,
        bodyWaterPct: measurmentData.BodyWater,
        fatFreeMassInKg: measurmentData.FatFreeMass,
        mineralInKg: measurmentData.MineralMass,
        mineralPct: measurmentData.Mineral,
        muscleMassPct: measurmentData.MuscleMass,
        musclePct: measurmentData.Muscle,
        pulse: measurmentData.Pulse,
        proteinMassKg: measurmentData.ProteinMass,
        proteinPct: measurmentData.Protein,
        spo2: measurmentData.SpO2,
    };

    const user = await db.query.user.findFirst({
        where(fields, operators) {
            return operators.eq(fields.email, measurmentData.EmailAddress ?? "");
        },
    });

    if (user === undefined) {
        console.error("error while converting abby measurment to observation - user not found", {
            email: measurmentData.EmailAddress,
        });
        sendResponse(res, successfullResponse({}));
        return;
    }

    const detailsRecord: DeepPartial<Record<PatientDetailsTopic, PatientDetails>> = {
        measurment: measurement,
        vitals: vital,
    };

    const observations = getMultiObservationforPatientDetails(detailsRecord, user.id);

    try {
        const observationPromises = observations.map(async (observation) => {
            const type = (observation.code?.coding?.[0]?.code ?? "") as PatientDetailsTopic;
            if (Object.values(PatientDetailsTopic).indexOf(type) === -1) {
                return;
            }
            // For vitals we need to directly create resource.
            if (type === PatientDetailsTopic.VITALS) {
                await medplum.createResource(observation);

                return;
            }
            if (type === PatientDetailsTopic.MEASURMENT) {
                const exists = await medplum.searchOne("Observation", {
                    patient: user.id,
                    _fields: ["id", "component"],
                    code: type,
                });
                if (exists) {
                    // Assign existing id
                    observation.id = exists.id;
                    observation.component = combineObsComponents(
                        exists.component ?? [],
                        observation.component ?? []
                    );
                    await medplum.updateResource(observation);

                    return;
                }
                // Link the medplum resource and the uploaded file
                await medplum.createResource(observation);

                return;
            }
            if (type === PatientDetailsTopic.MEDICAL_CONDITION) {
                const exists = await medplum.searchOne("Observation", {
                    patient: user.id,
                    _fields: ["id", "component"],
                    code: PatientDetailsTopic.MEDICAL_CONDITION,
                });
                if (exists) {
                    observation.id = exists.id;
                    // If this topic exists append the entries to existing topics
                    observation.component = convergeArrayObs(
                        exists.component ?? [],
                        observation.component ?? []
                    );
                    await medplum.updateResource(observation);

                    return;
                }
                await medplum.createResource(observation);

                return;
            }

            if (type === PatientDetailsTopic.ALLERGIES) {
                const exists = await medplum.searchOne("Observation", {
                    patient: user.id,
                    _fields: ["id", "component"],
                    code: PatientDetailsTopic.ALLERGIES,
                });
                if (exists) {
                    observation.id = exists.id;
                    observation.component = Array.from(
                        new Set([...(exists.component ?? []), ...(observation.component ?? [])])
                    );
                    await medplum.updateResource(observation);

                    return;
                }
                await medplum.createResource(observation);

                return;
            }
        });
        await Promise.all(observationPromises);
        sendResponse(res, { message: ReasonPhrases.CREATED, id: "" });
    } catch (error) {
        console.error("An error occured while adding patient details from abby: \n", error);
        sendResponse(res, errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error));
    }
};
