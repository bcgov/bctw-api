import { constructGetQuery, query } from '../database/query';
import { Animal } from '../types/animal';

// Applies to all tests in this file
// beforeEach(() => {
// });

test('can query animal table', async () => {
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