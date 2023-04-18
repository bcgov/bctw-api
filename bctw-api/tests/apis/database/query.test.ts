import { merge } from '../../../src/database/query';
const a = [{ id: 1, aData: 1 }];
const b = [{ id: 1, bData: 2 }];
describe('query', () => {
  describe(merge.name, () => {
    it('should merge successfully on valid data', () => {
      const merged = merge(a, b, 'id');
      merged.forEach((m) => expect(m._merged).toBe(true));
      expect(merged.length).toBe(1);
      expect(merged[0]).toHaveProperty('bData');
      expect(merged[0]).toHaveProperty('aData');
    });
    it('merge contains false value on non matching property key. ', () => {
      const merged = merge(a, [{ id: 2, ...b }], 'id');
      expect(merged.length).toBe(1);
      merged.forEach((m) => expect(m._merged).toBe(false));
    });
    it('merge is empty when property that does not exist', () => {
      const merged = merge(a, b, 'bad_id' as any);
      expect(merged.length).toBe(0);
    });
    it('merge contains true values when b array is valid & longer. merge length == a length', () => {
      const merged = merge(a, [...b, { id: 2, bData: 10 }], 'id');
      expect(merged.length).toBe(1);
      expect(merged.length).toBe(a.length);
      merged.forEach((m) => expect(m._merged).toBe(true));
    });
    it('merge contains false values when a array is valid & longer. merge length == a length', () => {
      const merged = merge([...a, { id: 2, bData: 10 }], b, 'id');
      expect(merged.length).toBe(2);
      expect(merged[0]._merged).toBe(true);
      expect(merged[1]._merged).toBe(false);
    });
    it('merge is empty when arrays empty', () => {
      const merged = merge([], [], 'id');
      expect(merged.length).toBe(0);
      const merged2 = merge([], b, 'id');
      expect(merged2.length).toBe(0);
      const merged3 = merge(a, [], 'id');
      expect(merged3.length).toBe(0);
    });
  });
});
