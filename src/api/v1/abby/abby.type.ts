export interface AbbyMeasurment{
    FirstName: string;
    LastName: string;
    DateOfBirth: string; // Format: YYYY/MM/DD
    Gender: 0 | 1; // 0: female, 1: male
    EmailAddress?: string; // User’s Email Address (if supplied)
    MeasurementTimestamp: string; // Time and date of measurement
    UserAge: number; // User's age on the day of the measurement
    MetabolicAge: number; // Calculated Metabolic Age
    Weight: number; // Weight (kg)
    Height: number; // Height (cm)
    BMI: number;
    SystolicBP: number; // SystolicBP (mmHg)
    DiastolicBP: number; // DiastolicBP (mmHg)
    Pulse: number; // BPM
    SpO2: number; // SpO2 (%)
    BodyFat: number; // Bodyfat (%)
    DCI_kcal: number; // Daily Calorie Intake (kcal)
    BodyWater: number; // Body Water (%)
    BodyWaterMass: number; // Body Water (kg)
    FatFreeMass: number; // Fat Free Mass (kg)
    BodyFatMass: number; // Bodyfat(kg)
    StdBodyWeight: number; // Standard body weight(kg)
    BMR_kcal: number; // kcal
    Temperature: number; // °C
    Protein: number; // Protein (%)
    ProteinMass: number; // Protein (kg)
    Mineral: number; // Mineral (%)
    MineralMass: number; // Mineral (kg)
    Muscle: number; // Muscle (%)
    MuscleMass: number; // Muscle (%)
}