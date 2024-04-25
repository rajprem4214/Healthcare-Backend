import { Extension, Observation, ObservationComponent } from "@medplum/fhirtypes";
import {
    DetailsMetaDataDocs,
    MedplumPatientDetailExtensionID,
    MetaData,
    PatientAllergies,
    PatientDetails,
    PatientDetailsTopic,
    PatientMedicalConditions,
} from "./patientTypes";
import { DeepPartial } from "../../../interfaces/utils";

export function mapDetailsToObservation(details: Record<string, unknown>): Array<ObservationComponent> {
    return Object.entries(details)
        .filter((val) => val[1] !== undefined && !Number.isNaN(val[1]) && !val[1] !== null)
        .map((val) => {
            const key = val[0];
            const value = val[1];

            // All the keys starting with a $ sign are not to be mapped. They are extra variables not meant as fields
            if (!key.startsWith("$")) {
                const obsComponent = {
                    id: key,
                    code: {
                        coding: [
                            {
                                code: key,
                            },
                        ],
                    },
                } as ObservationComponent;
                if (typeof value === "boolean") {
                    obsComponent.valueBoolean = value;
                } else if (typeof value === "number") {
                    obsComponent.valueInteger = value;
                } else {
                    obsComponent.valueString = String(value);
                }

                if (details?.$metaData) {
                    const meta = (details.$metaData as Record<string, unknown>) ?? {};
                    if (meta.docs) {
                        const docList = meta.docs as DetailsMetaDataDocs;

                        // Store the docs for current field.
                        const curKeyDocs = docList[key as keyof typeof docList];

                        // Map the stored docs  as medplum extensions.
                        if (Array.isArray(curKeyDocs)) {
                            const mappedDocsAsExtensions = curKeyDocs.map((val) => {
                                return {
                                    id: key,
                                    url: MedplumPatientDetailExtensionID.UPLOAD_DOC_URLS,
                                    valueString: val,
                                } as Extension;
                            });
                            // Append the existing extensions to existing extensions
                            obsComponent.extension = [
                                ...(obsComponent.extension ?? []),
                                ...mappedDocsAsExtensions,
                            ];
                        }
                    }
                }

                return obsComponent;
            }
        })
        .filter((val) => val !== undefined) as Array<ObservationComponent>;
}

export function getMultiObservationforPatientDetails(
    details: DeepPartial<Record<PatientDetailsTopic, PatientDetails>>,
    patientId: string
) {
    // Remove non existent fields
    const observations = Object.entries(details)
        // Filter all the invalid value fields
        .filter((val) => val[1] !== undefined && val[1] !== null && !Number.isNaN(val[1] !== undefined))
        // Map every input to respective an medplum observation
        .map(([inputKey, inputVal]) => {
            const observation: Observation = {
                resourceType: "Observation",
                code: {
                    coding: [
                        {
                            code: inputKey,
                            id: inputKey,
                            userSelected: true,
                        },
                    ],
                },
                subject: {
                    type: "Patient",
                    id: patientId,
                    reference: `Patient/${patientId}`,
                },
                status: "final",
            };

            let componentData: Record<string, unknown> = inputVal as unknown as Record<string, unknown>;
            // Handle array values serialization. Since the data is stored in different fields
            if (
                [PatientDetailsTopic.ALLERGIES, PatientDetailsTopic.MEDICAL_CONDITION].includes(
                    inputKey as PatientDetailsTopic
                )
            ) {
                componentData = (inputVal as PatientAllergies | PatientMedicalConditions)
                    ?.data as unknown as Record<string, unknown>;
            }

            const components = mapDetailsToObservation(componentData ?? {});
            observation.component = components;
            return observation;
        });
    return observations;
}

/**
 *
 * @param c1 - The old observation components. Any delete operations will be performed on this data.
 * @param c2  - The new observations which are to be appended.
 * @returns
 */
export function combineObsComponents(c1: Array<ObservationComponent>, c2: Array<ObservationComponent>) {
    const mappedC1: Record<string, ObservationComponent> = {};
    // Here string is the id of the observation component
    let diffOutputs: Record<string, ObservationComponent> = {};

    // Map all the c1 entries to following : ObsComponentID->ObsComponent
    c1.forEach((val) => {
        if (typeof val.id === "string" && val.id.length > 0) {
            mappedC1[val.id] = val;
        }
    });

    c2.forEach((val) => {
        const id = val.id;
        if (typeof id === "string" && id.length > 0) {
            // If entry already exists combine the both
            if (mappedC1[id] !== undefined) {
                const existing = mappedC1[id];
                const existingExtension = existing.extension ?? [];
                const valExtension = val.extension ?? [];

                const joinedExtensions = convergeExtensions(existingExtension, valExtension);

                if (joinedExtensions.length > 0) {
                    val.extension = joinedExtensions;
                }
                diffOutputs[id] = val;
                delete mappedC1[id];
            }
        }
    });

    diffOutputs = { ...diffOutputs, ...mappedC1 };

    return Object.values(diffOutputs);
}

/**
 *
 * @param obs1 The old observation components. Any delete operations will be performed on this data.
 * @param obs2 The new observation components
 */
export function convergeArrayObs(obs1: Array<ObservationComponent>, obs2: Array<ObservationComponent>) {
    // The value stored in this component such as valueString/valueInteger must be the key
    const uniqueMaps: Record<string, Array<ObservationComponent>> = {};

    // Store the unique entries from both the observations in a single record to converge them.
    obs1.forEach((o) => {
        const val = String(o.valueBoolean ?? o.valueInteger ?? o.valueString ?? o.valueDateTime);
        if (val.length > 0) {
            // Create a new entry if it does not exists
            if (uniqueMaps[val] == undefined) {
                uniqueMaps[val] = [o];
                return;
            }
            uniqueMaps[val].push(o);
        }
    });
    obs2.forEach((o) => {
        const val = String(o.valueBoolean ?? o.valueInteger ?? o.valueString ?? o.valueDateTime);
        if (val.length > 0) {
            // Create a new entry if it does not exists
            if (uniqueMaps[val] == undefined) {
                uniqueMaps[val] = [o];
                return;
            }
            uniqueMaps[val].push(o);
        }
    });

    Object.entries(uniqueMaps).map((entry) => {
        const key = entry[0];
        const value = entry[1];

        if (value.length > 0) {
            // Combine all the entries to a single entry in array while converging all the overlapping fields in a unique way.
            const comp = value.reduce((prevV, newV) => {
                const convergedExt = convergeExtensions(prevV.extension ?? [], newV.extension ?? []);

                return {
                    ...newV,
                    // Assign the converged extension only if length is greater than 0
                    ...(convergedExt.length > 0 ? { extension: convergedExt } : {}),
                };
            });

            // Reassign the generated converged observation component
            uniqueMaps[key] = [comp];
            return;
        }

        // If there are no entries delete the value
        delete uniqueMaps[key];
    });

    const cleanedComponents = Object.values(uniqueMaps)
        .map((c) => {
            if (c.length === 1) {
                return c.at(0);
            }
        })
        .filter((c) => c !== undefined) as Array<ObservationComponent>;

    return reallocateIdforArrayObsComponent(cleanedComponents);
}

export function convergeExtensions(oldExt: Array<Extension>, newExt: Array<Extension>) {
    // Converge all the extensions and remove the duplicate entry for same extensions
    const oldExtMap: Record<string, Extension> = {};
    oldExt.forEach((ext) => {
        if (ext.url && ext.id) {
            const key = getConvergeExtensionKey(ext.url, ext.id);
            oldExtMap[key] = ext;
        }
    });

    newExt.forEach((ext) => {
        if (ext.url && ext.id) {
            const key = getConvergeExtensionKey(ext.url, ext.id);

            const existingMatchExtensionIdx = oldExtMap[key];
            // If same entry exists for an extension i.e a unique entry is already existing remove it from old
            if (existingMatchExtensionIdx !== undefined) {
                delete oldExtMap[key];
            }
        }
    });
    return [...Object.values(oldExtMap), ...newExt];
}

export function getConvergeExtensionKey(url: string, id: string) {
    return url + "__" + id;
}

// This function reassigns the id properly for array based observation. It works only when id field of observation component is the id of the index
export function reallocateIdforArrayObsComponent(
    components: Array<ObservationComponent>,
    reassignExtension = false
) {
    return components.map((component, idx) => {
        component.id = String(idx);

        // Reallocate the code
        if (component.code && Array.isArray(component.code.coding) && component.code.coding.length > 0) {
            component.code.coding[0] = { code: String(idx) };
        }

        // Reallocate id in extension
        if (reassignExtension && Array.isArray(component.extension)) {
            component.extension = component.extension.map((ext) => {
                return { ...ext, id: String(idx) };
            });
        }
        return component;
    });
}
export function mapPatDetailObsToRecord(observation: Observation) {
    const mappedDetails: Record<string, boolean | number | string | MetaData | Array<string>> = {};
    const uploadDocList: Record<string, Array<string>> = {};

    if (Array.isArray(observation.component)) {
        // Loop over all the measured vitals
        observation.component.forEach((val) => {
            if (typeof val.id === "string") {
                mappedDetails[val.id] =
                    val.valueBoolean ??
                    val.valueDateTime ??
                    val.valueInteger ??
                    val.valueBoolean ??
                    val.valueTime ??
                    val.valueString ??
                    "";
                // Loop over the extensions to get extra data stored.
                if (Array.isArray(val.extension)) {
                    // Get all the associated uploaded document urls.
                    const docList = val.extension
                        .map((v) => {
                            if (v.url === MedplumPatientDetailExtensionID.UPLOAD_DOC_URLS) {
                                return v.valueString;
                            }
                        })
                        .filter((v) => v !== undefined) as Array<string>;

                    uploadDocList[val.id] = docList;
                }
            }
        });

        const code = observation.code?.coding?.at(0)?.code as PatientDetailsTopic;

        // Convert it to array based data if it is an array based data
        if ([PatientDetailsTopic.ALLERGIES, PatientDetailsTopic.MEDICAL_CONDITION].includes(code)) {
            const dataArr = [...Object.values(mappedDetails)] as Array<string>;
            // Clear the object and remove all data
            Object.keys(mappedDetails).forEach((detail) => delete mappedDetails[detail]);

            mappedDetails["data"] = dataArr;
        }

        if (!mappedDetails["$metaData"]) {
            mappedDetails["$metaData"] = {} as MetaData;
        }
        mappedDetails["$metaData"] = {
            id: observation.id,
            type: (observation.code?.coding?.at(0)?.code ?? "") as PatientDetailsTopic,
        };
    }

    return { data: mappedDetails, uploadDocList: uploadDocList };
}
