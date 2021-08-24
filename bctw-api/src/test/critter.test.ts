import { pg_upsert_animal_fn, upsertAnimal, _upsertAnimal } from '../apis/animal_api';
import { constructFunctionQuery, constructGetQuery, query } from '../database/query';
import { Animal } from '../types/animal';

// Applies to all tests in this file
// beforeEach(() => {
// });

/**
 * not sure why async await isnt working
 * promise needs to be returned from the test to have it succeed
 */

test.skip('can query animal table', async () => {
  expect.assertions(3);
  const sql = constructGetQuery({base: `select * from animal limit 1;`}) ;
  return query(sql).then(data=> {
    const {result, isError} = data;
    expect(isError).toBe(false);
    expect(result.rowCount).toBe(1);
    const row: Animal = result.rows[0];
    expect(row).toHaveProperty('critter_id');
  });

  //fixme: await not working
  // try {
  //   const { result, error, isError } = await query(sql, '', true);
  //   expect(result.rowCount).toBe(1);
  // } catch (e) {
  //   console.log('ERERRORROROR', e)
  // }
});

test('changing an animal\'s gender updates all of its history', async () => {
  expect.assertions(4);
  const critter_id =  '95953f22-2bc9-40db-bd4b-c0fa937f1be0'; // this critter_id has history
  // some values to change on the animal
  const animal_id = 'newanimalid';
  const sex = 'Male';
  const critter = { critter_id, animal_id, sex };
  return _upsertAnimal('jcraven', [critter as Animal]).then(r => {
    const updated = r.results[0] as Animal;
    expect(updated.critter_id).toBe(critter_id);
    expect(updated.animal_id).toBe(animal_id);
    expect(updated.sex).toBe(sex);
    // retrieve
    const sql = constructGetQuery({base: `select * from animal_v where critter_id = '${critter_id}'`});
    return query(sql).then(data => {
      const { result } = data;
      expect(result.rowCount).toBeGreaterThan(1);
      console.log(`animal has been modified ${result.rowCount} times`);
      /* fixme: isn't working cause the upsert is being rolled back 
         by the time the select query is executed
      */ 
      // const current = result.rows.filter(r => r.valid_to === null)
      // console.log('current animal', current);
      const history = result.rows.filter(r => r.valid_to !== null)
      const animal_ids = history.map(r => r.animal_id);
      console.log(`animal_ids found: ${animal_ids}`);
      const genders = history.map(r => r.sex);
      console.log(`genders found: ${genders}`);
    })
  })
})