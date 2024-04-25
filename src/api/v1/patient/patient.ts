import { Request, Response } from 'express';
import { body, oneOf, query, validationResult } from 'express-validator';
import { medplum } from '../../../config/medplum';
import {
  errorResponse,
  sendResponse,
  successfullResponse,
} from '../../../utils/sendResponse';
import { ReasonPhrases } from 'http-status-codes';
import { db } from '../../../config/database';
import { extractPaginationParams } from '../../../utils/helper';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { schema } from '../../../db';
import { isValidDate } from '@medplum/core';
import {
  combineObsComponents,
  convergeArrayObs,
  getMultiObservationforPatientDetails,
  mapPatDetailObsToRecord,
} from './patientDetails';
import {
  MetaData,
  PatientDetails,
  PatientDetailsFileTopic,
  PatientDetailsTopic,
  PatientVital,
} from './patientTypes';

export const patientUpdateValidators = [
  query('healthId')
    .isString()
    .custom(async (value, { req }) => {
      try {
        const patient = await db.query.user.findFirst({
          where: eq(schema.user.healthId, value),
        });

        // Store the patient in body so as for future use cases.
        req.body.patient = patient;
      } catch (err: any) {
        console.error(err);
        if (err?.message === 'Not found')
          throw new Error('Patient not found. Please provide a valid ID');
        else throw new Error(err?.message);
      }
    }),
  oneOf(
    [
      body('gender').custom((value) => {
        if (value) {
          if (['Male', 'Female', 'Other', 'Unknown'].includes(value)) {
            return;
          } else
            throw new Error(
              'Gender must be either `Male`,`Female`, `Other` or `Unknown`.'
            );
        }
        return;
      }),
      body('marital_status').custom((value) => {
        if (
          value &&
          [
            'Married',
            'Polygamous',
            'Never Married',
            'Domestic Partner',
            'unmarried',
            'Widowed',
            'Divorced',
          ].includes(value)
        ) {
          return;
        }
        throw new Error(
          'Marital status must be either `Married`,`Polygamous`, `Never Married` or `Domestic Partner`, `unmarried`,`Widowed`, `Divorced`'
        );
      }),
    ],
    {
      message: 'Atleast one of gender or marital status must be provided.',
      errorType: 'least_errored',
    }
  ),
];
export const updatePatientHandler = async (req: Request, res: Response) => {
  sendResponse(res, successfullResponse({ message: 'Details updated' }));
};

export const getAllPatients = async (req: Request, res: Response) => {
  const pageParams = extractPaginationParams(req);

  try {
    const userList = await db.query.user.findMany({
      offset: pageParams.offset,
      limit: pageParams.limit,
      orderBy(fields, operators) {
        return operators.asc(fields.createdAt);
      },
      where(fields, operators) {
        return operators.inArray(fields.roles, ['patient']);
      },
    });

    sendResponse(
      res,
      successfullResponse({
        data: userList,
        page: pageParams.page,
        limit: pageParams.limit,
        count: userList.length,
      })
    );
  } catch (error) {
    console.error(
      'An error occured while getting all patient details: \n',
      error
    );
    throw error;
  }
};

export const addPatientDetailsValidator = [
  body().custom((value) => {
    // Custom validation to check if the request body is empty
    if (Object.keys(value).length === 0) {
      throw new Error('Request body is empty.');
    }
    return true;
  }),
  query('healthId')
    .isString()
    .custom(async (value, { req }) => {
      try {
        const patient = await db.query.user.findFirst({
          where: eq(schema.user.healthId, value),
        });

        // Store the patient in body so as for future use cases.
        req.body.patient = patient;
      } catch (err: any) {
        console.error(err);
        if (err?.message === 'Not found')
          throw new Error('Patient not found. Please provide a valid ID');
        else throw new Error(err?.message);
      }
    }),
  // Vitals
  body('vitals').optional().isObject().withMessage('Vitals must be an object.'),
  body('vitals.heartRate')
    .optional()
    .isInt()
    .withMessage('Heart rate must be an integer.'),
  body('vitals.spo2')
    .optional()
    .isFloat({ min: 5, max: 100 })
    .withMessage('Spo2 must be a number between 5 and 100.'),
  body('vitals.respiratoryRate')
    .optional()
    .isInt()
    .withMessage('Respiratory rate must be an integer.'),
  body('vitals.hydration')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Hydration must be an integer between 0 and 100.'),
  body('vitals.stepCount')
    .optional()
    .isInt()
    .withMessage('Step count must be an integer.'),
  body('vitals.$metaData').optional(),
  body('vitals.$metaData.docs.*').optional().isArray(),
  // Measurment
  body('measurment.height')
    .optional()
    .isInt()
    .withMessage('Height must be an integer.'),
  body('measurment.weightInKg')
    .optional()
    .isInt()
    .withMessage('Weight must be an integer.'),
  body('measurment.gender')
    .optional()
    .isString()
    .isIn(['Male', 'Female', 'Other', 'Unknown'])
    .withMessage('Gender can only be - Male,Female,Other,Unknown'),
  body('measurment.age')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Age must be an integer greater than 0'),
  body('measurment.healthAnalysis')
    .optional()
    .isString()
    .withMessage('Health Analysis must be proper string'),
  body('measurment.fatPct')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Fat percentage must be an integer between 2 and 100.'),
  body('measurment.bmi')
    .optional()
    .isFloat()
    .withMessage('BMI must be a number.'),
  body('measurment.rbcCount')
    .optional()
    .isInt()
    .withMessage('RBC count must be an integer.'),
  body('measurment.platelets')
    .optional()
    .isInt()
    .withMessage('Platelets must be an integer.'),
  body('measurment.goal')
    .optional()
    .isString()
    .withMessage('Goal must be a string.'),
  body('measurment.bloodType')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-'),
  body('measurment.alcholUseLevel')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Alcohol use level must be an integer between 1 and 5.'),
  body('measurment.mood')
    .optional()
    .isIn(['Sad', 'Happy', 'Anxious', 'Depressed', 'Neutral'])
    .withMessage(
      'Mood must be one of: Sad, Happy, Anxious, Depressed, Neutral.'
    ),
  body('measurment.fitnessLevel')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Fitness level must be an integer between 1 and 5.'),
  body('measurment.eatingHabit')
    .optional()
    .isIn(['Balance Diet', 'Low Carb', 'Gluten Free', 'Mostly Vegetarian'])
    .withMessage(
      'Eating habit must be one of: Balance Diet, Low Carb, Gluten Free, Mostly Vegetarian.'
    ),
  body('measurment.$metaData').optional(),
  body('measurment.$metaData.docs.*').optional().isArray(),
  body('medicalConditions.data').optional().isArray({ min: 1 }),
  body('medicalConditions.$metaData').optional(),
  body('medicalConditions.$metaData.docs.*').optional().isArray(),
  body('allergies.data').optional().isArray({ min: 1 }),
  body('allergies.$metaData').optional(),
  body('allergies.$metaData.docs.*').optional().isArray(),
];
export const createPatientDetails = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors);
    sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors));
    return;
  }
  const body = req.body ?? {};

  const patient = req.body.currentUser ?? {};

  if (!patient) {
    sendResponse(res, {
      message: ReasonPhrases.BAD_REQUEST,
      id: req.query.healthId,
    });
    return;
  }

  const patientId = (patient.id as string) ?? '';

  if (patientId === '') {
    sendResponse(res, { message: ReasonPhrases.BAD_REQUEST, id: '' });
    return;
  }
  const patientData: Partial<Record<PatientDetailsTopic, PatientDetails>> = {
    vitals: body.vitals,
    measurment: body.measurment,
    medicalConditions: body.medicalConditions,
    allergies: body.allergies,
  };

  const observations = getMultiObservationforPatientDetails(
    patientData,
    patientId
  );
  try {
    const observationPromises = observations.map(async (observation) => {
      const type = (observation.code?.coding?.[0]?.code ??
        '') as PatientDetailsTopic;
      if (Object.values(PatientDetailsTopic).indexOf(type) === -1) {
        return;
      }
      // For vitals we need to directly create resource.
      if (type === PatientDetailsTopic.VITALS) {
        const rsrc = await medplum.createResource(observation);
        // Link the uploaded files to their medplum resource id
        if (rsrc.id && patientData.vitals?.$metaData?.docs) {
          const fileIdList = Object.values(
            patientData.vitals?.$metaData?.docs
          ).flat();
          linkFileandDetails(rsrc.id ?? '', fileIdList);
        }
        return;
      }
      if (type === PatientDetailsTopic.MEASURMENT) {
        const exists = await medplum.searchOne('Observation', {
          patient: patientId,
          _fields: ['id', 'component'],
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

          if (exists.id && patientData.measurment?.$metaData?.docs) {
            const fileIdList = Object.values(
              patientData.measurment?.$metaData?.docs
            ).flat();
            linkFileandDetails(exists.id ?? '', fileIdList);
          }
          return;
        }
        // Link the medplum resource and the uploaded file
        const rsrc = await medplum.createResource(observation);
        if (rsrc.id && patientData.measurment?.$metaData?.docs) {
          const fileIdList = Object.values(
            patientData.measurment?.$metaData?.docs
          ).flat();
          linkFileandDetails(rsrc.id ?? '', fileIdList);
        }
        return;
      }
      if (type === PatientDetailsTopic.MEDICAL_CONDITION) {
        const exists = await medplum.searchOne('Observation', {
          patient: patientId,
          _fields: ['id', 'component'],
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
          // Link all the files for this resource in database
          if (exists.id && patientData.medicalConditions?.$metaData?.docs) {
            const fileIdList = Object.values(
              patientData.medicalConditions?.$metaData?.docs
            ).flat();
            linkFileandDetails(exists.id ?? '', fileIdList);
          }
          return;
        }
        const rsrc = await medplum.createResource(observation);

        // Link all the files for this resource in database
        if (rsrc.id && patientData.medicalConditions?.$metaData?.docs) {
          const fileIdList = Object.values(
            patientData.medicalConditions?.$metaData?.docs
          ).flat();
          linkFileandDetails(rsrc.id ?? '', fileIdList);
        }
        return;
      }

      if (type === PatientDetailsTopic.ALLERGIES) {
        observation.id = `allergies/${patientId}`;
        const exists = await medplum.searchOne('Observation', {
          patient: patientId,
          _fields: ['id', 'component'],
          code: PatientDetailsTopic.ALLERGIES,
        });
        if (exists) {
          observation.id = exists.id;
          observation.component = Array.from(
            new Set([
              ...(exists.component ?? []),
              ...(observation.component ?? []),
            ])
          );
          await medplum.updateResource(observation);
          // Link all the files for this resource in database
          if (exists.id && patientData.allergies?.$metaData?.docs) {
            const fileIdList = Object.values(
              patientData.allergies?.$metaData?.docs
            ).flat();
            linkFileandDetails(exists.id ?? '', fileIdList);
          }
          return;
        }
        const rsrc = await medplum.createResource(observation);
        // Link all the files for this resource in database
        if (rsrc.id && patientData.allergies?.$metaData?.docs) {
          const fileIdList = Object.values(
            patientData.allergies?.$metaData?.docs
          ).flat();
          linkFileandDetails(rsrc.id ?? '', fileIdList);
        }
        return;
      }
    });
    await Promise.all(observationPromises);
    sendResponse(res, { message: ReasonPhrases.CREATED, id: '' });
  } catch (error) {
    console.error('An error occured while adding patient details: \n', error);
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
    );
  }
};

export const getVitalsHistoryValidator = [
  query('start_after').optional().isString().isISO8601(),
];

export async function getVitalsHistory(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors);
    sendResponse(res, errorResponse(ReasonPhrases.EXPECTATION_FAILED, errors));
    return;
  }
  const body = req.body ?? {};

  const pageParams = extractPaginationParams(req);

  const patient = body.currentUser ?? {};

  let endDateLimit: Date | undefined;

  // If it is mentioned then only apply the date filter. It gets the data after the specified date.
  const rawEndDate = String(req.query.start_after);
  if (String(req.query.after).length > 0) {
    if (isValidDate(new Date(rawEndDate))) {
      endDateLimit = new Date(rawEndDate);
      endDateLimit.setUTCHours(0, 0, 0, 0);
    }
  }

  const page = await medplum.searchResources('Observation', {
    code: PatientDetailsTopic.VITALS,
    patient: patient?.id ?? '',
    ...(endDateLimit instanceof Date
      ? { _lastUpdated: `sa${endDateLimit.toISOString()}` }
      : {}),
    _count: pageParams.limit,
    _offset: pageParams.offset,
    _sort: '-_lastUpdated',
    _total: 'accurate',
  });

  const rawObservation = page;
  let mappedVitals: Array<Record<string, unknown>> = [];

  // Loop over all the
  rawObservation?.forEach((observation) => {
    // Only map the array to object if resource is present
    if (observation) {
      // Map the data in observation vital to a key value pair object
      const mappedData = mapPatDetailObsToRecord(observation);
      const vital: Partial<PatientVital> = {
        ...(mappedData.data as Partial<PatientVital>),
        $metaData: {
          docs: mappedData.uploadDocList,
          type: (observation?.code?.coding?.at(0)?.code ??
            '') as PatientDetailsTopic,
        },
      };
      mappedVitals = [...mappedVitals, vital];
    }
  });

  sendResponse(
    res,
    successfullResponse({
      data: mappedVitals,
      page: pageParams.page,
      limit: pageParams.limit,
      count: page.bundle.total ?? -1,
    })
  );
}

export const getPatientDetailsValidator = [
  query('healthId')
    .isString()
    .custom(async (value, { req }) => {
      try {
        const patient = await db.query.user.findFirst({
          where: eq(schema.user.healthId, value),
        });

        // Store the patient in body so as for future use cases.
        req.body.patient = patient;
      } catch (err: any) {
        console.error(err);
        if (err?.message === 'Not found')
          throw new Error('Patient not found. Please provide a valid ID');
        else throw new Error(err?.message);
      }
    }),
];
export const getPatientDetails = async (req: Request, res: Response) => {
  try {
    // Get the user from the body
    const user = req.body.currentUser;

    if (!user?.id) {
      sendResponse(
        res,
        errorResponse(ReasonPhrases.NOT_FOUND, new Error('User ID is missing.'))
      );
      return;
    }

    const observationPromises = Object.values(PatientDetailsTopic).map(
      async (topic) => {
        const obs = await medplum.searchOne('Observation', {
          code: topic,
          patient: user?.id ?? '',
        });
        return {
          key: topic,
          observation: obs,
        };
      }
    );
    const observations = await Promise.all(observationPromises);

    const mappedObs: Partial<
      Record<
        PatientDetailsTopic,
        Record<string, string | boolean | number> | Array<string> | MetaData
      >
    > = {};
    for (const obs of observations) {
      if (obs.observation !== undefined) {
        mappedObs[obs.key] = mapPatDetailObsToRecord(obs.observation).data;
        if ([PatientDetailsTopic.MEDICAL_CONDITION].indexOf(obs.key) !== -1) {
          const d = Object.values(mappedObs[obs.key] ?? {});
          mappedObs[obs.key] = d.flat().map((val) => String(val));
        }
      }
    }
    if (Object.keys(mappedObs).length === 0) {
      sendResponse(
        res,
        errorResponse(ReasonPhrases.NOT_FOUND, Error('No details found'))
      );
      return;
    }

    const resObj = {
      observations: mappedObs,
      user: user,
    };
    // Map all the details stored in the observation to key value pair
    sendResponse(res, successfullResponse(resObj));
  } catch (error) {
    console.error('An error occured while fetching patient details', error);
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
    );
  }
};

export async function getDetailsUploadedDocumentList(
  req: Request,
  res: Response
) {
  const pageParams = extractPaginationParams(req);

  const patient = req.body.currentUser;
  const withAssociatedRecords = req.query.with_associated_detail === 'true';

  try {
    const uploadDocList = await db.query.uploadedFiles.findMany({
      orderBy(fields, operators) {
        return operators.desc(fields.updatedAt);
      },
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.uploadedBy, patient.id),
          operators.eq(fields.uploadTopic, PatientDetailsFileTopic)
        );
      },

      offset: pageParams.offset,
      limit: pageParams.limit,
    });
    // Need a second query to fetch the total count of matching documents.
    const uploadDocTotalCount = Number(
      (
        await db
          .select({ count: sql<number>`count(${schema.uploadedFiles.id})` })
          .from(schema.uploadedFiles)
          .where(
            and(
              eq(schema.uploadedFiles.uploadedBy, patient.id),
              eq(schema.uploadedFiles.uploadTopic, PatientDetailsFileTopic)
            )
          )
      )?.at(0)?.count
    );

    let pageToSend = uploadDocList.map((doc) => {
      return {
        ...doc,
        uploadTopic: undefined,
        uploadTopicResourceId: undefined,
      };
    });

    if (withAssociatedRecords) {
      const uploadIds = uploadDocList
        .map((doc) => doc.uploadTopicResourceId)
        .filter((doc) => Boolean(doc)) as Array<string>;
      const searchRes = await medplum.searchResources('Observation', {
        _id: uploadIds.join(','),
        _total: 'accurate',
      });
      const patientDetailsArr = searchRes.map(
        (sRes) => mapPatDetailObsToRecord(sRes).data
      );

      // Store the mapped patient details as id=>mappedData
      const idBasedMap: Record<
        string,
        Record<string, string | number | boolean | string[] | MetaData>
      > = {};

      // Pop
      patientDetailsArr.forEach((detail) => {
        if (
          typeof detail?.$metaData === 'object' &&
          !Array.isArray(detail?.$metaData) &&
          typeof detail?.$metaData?.id === 'string'
        ) {
          idBasedMap[detail.$metaData.id] = detail;
        }
      });

      pageToSend = uploadDocList.map((uploadDoc) => {
        return {
          ...uploadDoc,
          uploadTopic: undefined,
          uploadTopicResourceId: undefined,
          ...(idBasedMap[uploadDoc.uploadTopicResourceId ?? ''] !== undefined
            ? { resource: idBasedMap[uploadDoc.uploadTopicResourceId ?? ''] }
            : { resource: null }),
        };
      });
    }
    res.send({
      data: pageToSend,
      page: pageParams.page,
      limit: pageParams.limit,
      count: uploadDocTotalCount,
    });
  } catch (error) {
    console.error(
      'An error occured while fetching patient details document list',
      error
    );
    sendResponse(
      res,
      errorResponse(ReasonPhrases.INTERNAL_SERVER_ERROR, error as Error)
    );
  }
}

const linkFileandDetails = async (
  resourceId: string,
  fileId: Array<string>
) => {
  const filteredIds = fileId.filter(
    (id) => typeof id === 'string' && id.length > 0
  );

  return await db
    .update(schema.uploadedFiles)
    .set({
      uploadTopicResourceId: resourceId,
      uploadTopic: PatientDetailsFileTopic,
    })
    .where(inArray(schema.uploadedFiles.id, filteredIds));
};
