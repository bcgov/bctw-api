import {
  applyCount,
  constructGetQuery,
  merge,
  obj_to_pg_array,
  to_pg_array,
  to_pg_obj,
  to_pg_str,
  to_pg_timestamp,
} from '../../../src/database/query';
const a = [{ id: 1, aData: 1 }];
const b = [{ id: 1, bData: 2 }];
const c = [
  { id: 1, aData: 1 },
  { id: 1, aData: 2 },
];
describe('query', () => {
  describe(applyCount.name, () => {
    it('should apply COUNT(*) if page < 2', () => {
      expect(applyCount(1)).toBeTruthy();
      expect(applyCount()).toBeTruthy();
      expect(applyCount(2)).not.toBeTruthy();
    });
  });
  describe(constructGetQuery.name, () => {
    const base = 'BASE';
    const q = { base: 'BASE' };
    it('should apply filter to query', () => {
      const query = constructGetQuery({ base, filter: 'blah' });
      expect(query).toBe(q.base + 'blah');
    });
    it('should apply group', () => {
      const query = constructGetQuery({ base, group: ['blah'] });
      expect(query).toBe(q.base + 'group by blah ');
    });
    it('should apply order by if order included', () => {
      const query = constructGetQuery({
        base,
        order: [{ field: 'blah', order: 'desc' }],
      });
      expect(query).toBe(q.base + `order by blah desc `);
    });
    it('should apply order by if order included', () => {
      const query = constructGetQuery({
        base,
        page: 1,
      });
      expect(query).toBe(q.base + `limit 100 offset 0;`);
    });
  });
  describe(to_pg_array.name, () => {
    it('should format array to pg array format', () => {
      expect(to_pg_array([1, 2])).toBe("'{1,2}'");
    });
  });
  describe(to_pg_timestamp.name, () => {
    it('should format aray to pg timestamp format', () => {
      expect(to_pg_timestamp(new Date())).toBe(
        `to_timestamp(${new Date()} / 1000)`
      );
    });
  });
  describe(obj_to_pg_array.name, () => {
    it('should format obj to pg array format', () => {
      expect(obj_to_pg_array({ a: 1, b: 2 })).toBe(`'[{"a":1,"b":2}]'`);
    });
  });
  describe(to_pg_str.name, () => {
    it('should format to pg string', () => {
      expect(to_pg_str('test')).toBe(`'test'`);
      expect(to_pg_str()).toBe(`''`);
    });
  });
  describe(to_pg_obj.name, () => {
    it('should format to pg object', () => {
      expect(to_pg_obj({ a: 1 })).toBe(`'{"a":1}'`);
    });
  });
  describe(merge.name, () => {
    it('should merge successfully on valid data', () => {
      const { merged, allMerged } = merge(a, b, 'id');
      merged.forEach((m) => expect(m._merged).toBe(true));
      expect(allMerged).toBe(true);
      expect(merged.length).toBe(1);
      expect(merged[0]).toHaveProperty('bData');
      expect(merged[0]).toHaveProperty('aData');
    });
    it('merge contains false value on non matching property key. ', () => {
      const { merged, allMerged } = merge(a, [{ id: 2, ...b }], 'id');
      expect(allMerged).toBe(false);
      expect(merged.length).toBe(1);
      merged.forEach((m) => expect(m._merged).toBe(false));
    });
    it('merge is empty when property that does not exist', () => {
      const { merged, allMerged } = merge(a, b, 'bad_id' as never);
      expect(allMerged).toBe(false);
      expect(merged.length).toBe(0);
    });
    it('merge contains all true _merge values when b array is valid & longer. merge length == a length', () => {
      const { merged, allMerged } = merge(
        a,
        [...b, { id: 2, bData: 10 }],
        'id'
      );
      expect(allMerged).toBe(true);
      expect(merged.length).toBe(1);
      expect(merged.length).toBe(a.length);
      merged.forEach((m) => expect(m._merged).toBe(true));
    });
    it('merge contains a false value when a array is valid & longer. merge length == a length', () => {
      const { merged, allMerged } = merge(
        [...a, { id: 2, bData: 10 }],
        b,
        'id'
      );
      expect(allMerged).toBe(false);
      expect(merged.length).toBe(2);
      expect(merged[0]._merged).toBe(true);
      expect(merged[1]._merged).toBe(false);
    });
    it('merge is empty when arrays empty', () => {
      const { merged, allMerged } = merge([], [], 'id');
      expect(allMerged).toBe(false);
      expect(merged.length).toBe(0);
      const { merged: merged2, allMerged: allMerged2 } = merge([], b, 'id');
      expect(allMerged2).toBe(false);
      expect(merged2.length).toBe(0);
      const { merged: merged3, allMerged: allMerged3 } = merge(a, [], 'id');
      expect(allMerged3).toBe(false);
      expect(merged3.length).toBe(0);
    });
    it('supports repeated merging from secondary into primary for non-unique primary ids (LEFT JOIN)', () => {
      const { merged, allMerged } = merge(c, b, 'id');
      expect(allMerged).toBe(true);
      expect(merged.length).toBe(2);
      merged.forEach((m) => {
        expect(m._merged).toBe(true);
        expect(m).toHaveProperty('aData');
        expect(m).toHaveProperty('bData');
      });
    });
  });
});
