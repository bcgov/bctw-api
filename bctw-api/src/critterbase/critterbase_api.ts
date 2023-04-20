import axios, { AxiosError, AxiosResponse, Method } from "axios";
import { formatAxiosError } from "../utils/error";


const critterBaseRequest = async (method: Method, url: string, body: any = {}) => {
    let errStr = '';
    const header = {headers: { 'API-KEY' : process.env.CRITTERBASE_API_KEY }}
    if(!process.env.CRITTERBASE_URL) {
        throw Error("Can't make requests unless CRITTERBASE_URL is set.")
    }
    switch (method.toUpperCase()) {
        case "GET": 
            return await axios
            .get(process.env.CRITTERBASE_URL + url, header)
            .catch((err: AxiosError) => {
                errStr = formatAxiosError(err);
                console.log(JSON.stringify(errStr))
            });

        case "POST":
            return await axios
            .post(process.env.CRITTERBASE_URL + url, body, header)
            .catch((err: AxiosError) => {
                errStr = formatAxiosError(err);
                console.log(JSON.stringify(errStr))
            });

    }
}

export { critterBaseRequest }