import {
  getRowResults,
  to_pg_function_query,
  queryAsyncTransaction,
  queryAsync,
} from "../pg";
import { User, UserRole } from "../types/user";
import { transactionify } from "../pg";
import { Request, Response } from "express";
import { QueryResult } from "pg";

const _addUser = async function (
  user: User,
  userRole: UserRole
): Promise<QueryResult> {
  const sql = transactionify(
    to_pg_function_query("add_user", [user, userRole])
  );
  const results = queryAsyncTransaction(sql);
  return results;
};

/* ## addUser
  - idir must be unique
  - todo: user adding must be admin?
*/
const addUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { user, role } = req.body;
  let data: QueryResult;
  try {
    data = await _addUser(user, role as UserRole);
  } catch (e) {
    return res.status(500).send(`Failed to add user: ${e}`);
  }
  const results = getRowResults(data, "add_user");
  return res.send(results[0]);
};

const _getUserRole = async function (idir: string): Promise<QueryResult> {
  const sql = `select bctw.get_user_role('${idir}');`;
  const result = await queryAsync(sql);
  return result;
};

const getUserRole = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || "") as string;
  if (!idir) {
    return res.status(500).send("IDIR must be supplied");
  }
  let data: QueryResult;
  try {
    data = await _getUserRole(idir);
  } catch (e) {
    return res.status(500).send(`Failed to query user role: ${e}`);
  }
  const results = data.rows.map((row) => row["get_user_role"]);
  return res.send(results[0]);
};

const _assignCritterToUser = async function (
  idir: string,
  animalId: number | number[],
  start: Date,
  end: Date
): Promise<QueryResult> {
  const sql = transactionify(
    to_pg_function_query("link_animal_to_user", [idir, animalId, start, end])
  );
  const result = await queryAsyncTransaction(sql);
  return result;
};

// todo: update add_animal db function
const assignCritterToUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || "") as string;
  if (!idir) {
    return res.status(500).send("IDIR must be supplied");
  }
  const { animalId, start, end } = req.body;
  const ids: number[] = Array.isArray(animalId) ? animalId : [animalId];
  let data: QueryResult;

  try {
    data = await _assignCritterToUser(idir, ids, start, end);
  } catch (e) {
    return res.status(500).send(`Failed to link user to critter(s): ${e}`);
  }
  const results = getRowResults(data, "link_animal_to_user");
  return res.send(results);
};

export { addUser, getUserRole, assignCritterToUser };
