import { Bundle, Resource } from "@medplum/fhirtypes"
import { medplum } from "../config/medplum"

export const getResourceHistory=async (resource:Resource,id:string) =>{
const accessToken = medplum.getAccessToken()
    const history = await medplum.get(medplum.getBaseUrl()+`fhir/R4/${resource}/${id}/_history`,{
        headers:{
            'Content-Type':"application/fhir+json",
            Authorization:"Bearer "+ accessToken
        }
        
    }) as Bundle<typeof resource>

    return history
}