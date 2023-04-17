import axios, { AxiosError, AxiosResponse } from "axios";
import { formatAxiosError } from "../../utils/error";


const get_critters_by_ids = async (ids:string[]): Promise<AxiosResponse> => {
    const critter_request_obj = {critter_ids: ids};
    // console.log(critter_request_obj)
    const critters = await axios.post('http://localhost:3001/api/critters', critter_request_obj).catch((err: AxiosError) => {
        formatAxiosError(err)
    })
    if (!critters) {
        throw Error("Failed to retrieve critter data from critterbase");
    }
    return critters;
}

export {get_critters_by_ids}