import { merge } from '../../../src/database/query';
const a = [{ id: 1, aData: 1 }];
const b = [{ id: 1, bData: 2 }];
const c = [
  { id: 1, aData: 1 },
  { id: 1, aData: 2 },
];
describe('query', () => {
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
      const { merged, allMerged } = merge(a, b, 'bad_id' as any);
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
