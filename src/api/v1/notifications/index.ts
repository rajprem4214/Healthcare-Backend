import { Novu } from "@novu/node";
import { env } from "../../../config/env";

const NOVU_API_KEY = env.NOVU_API_KEY as string;

export const novu = new Novu(NOVU_API_KEY);
