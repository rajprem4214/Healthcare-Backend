import { Router } from "express";
import { addAbbyMeasurment } from "./abby";

const abbyRouter = Router();

abbyRouter.post("/hook/measurments", addAbbyMeasurment);

export { abbyRouter };
