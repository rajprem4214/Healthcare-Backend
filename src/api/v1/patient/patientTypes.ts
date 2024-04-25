export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
export type PatientGender = "Male" | "Female" | "Other" | "Unknown"

export type ReferenceDocUrl = string

export const PatientDetailsFileTopic = "patient_details"


// Used to store the keys which are stored as extension in medplum for extra data purposes
export enum MedplumPatientDetailExtensionID{
    UPLOAD_DOC_URLS = "upload-doc-url"
}

// The keys of PatientDetailsInput and topic values for Patient
export enum PatientDetailsTopic {
    VITALS = "vitals",
    ALLERGIES = "allergies",
    MEDICAL_CONDITION = "medicalConditions",
    MEASURMENT = "measurment",
}

export type DetailsMetaDataDocs=Partial<Record<keyof Omit<PatientVital,"$metaData">, Array<ReferenceDocUrl>>>;

export interface MetaData {
    docs?: DetailsMetaDataDocs
    type?:PatientDetailsTopic
    id?:string
}

export interface PatientDetailArray<T>{
    data:Array<T>
    $metaData:MetaData
}

  
export interface PatientVital {
    id:string
    heartRate: number;
    spo2: number;
    respiratoryRate: number;
    hydration: number;
    stepCount: number;
    pulse: number;
    bodyWaterPct: number;
    bodyWaterInKg: number;
    fatFreeMassInKg: number;
    bodyFatInKg: number;
    proteinPct: number;
    proteinMassKg: number;
    mineralPct: number;
    mineralInKg: number;
    musclePct: number;
    muscleMassPct: number;
    $metaData: MetaData;
  }
  export interface PatientMeasurment {
    id:string
    height: number
    weightInKg: number
    /** Must be between 2 and 100 */
    fatPct: number
    bmi: number
    rbcCount: number
    platelets: number
    goal: string
    bloodType: BloodType
    alcholUseLevel: number
    mood: string
    fitnessLevel: number
    eatingHabit: string
    dKcal:number
    bmrKcal:number
    temprature:number
    allergy: string
    healthAnalysis: string
    age: number
    gender: PatientGender
    $metaData: MetaData;
}
export interface PatientMedicalConditions {
    id:string
    data: string[]
    $metaData: MetaData;
}
export interface PatientAllergies {
    id:string
    data: string[]
    $metaData: MetaData;
}

export type PatientDetails = PatientAllergies | PatientVital | PatientMeasurment | PatientMedicalConditions