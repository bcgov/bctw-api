import { merge } from '../../../src/database/query';
const a = [{ id: 1, aData: 1 }];
const b = [{ id: 1, bData: 2 }];
describe('query', () => {
  describe(merge.name, () => {
    it('should merge successfully on valid data', () => {
      const { merged, nonMerged, isFullyMerged } = merge(a, b, 'id');
      expect(isFullyMerged).toBe(true);
      expect(merged.length).toBe(1);
      expect(nonMerged.aArray.length).toBe(0);
      expect(nonMerged.bArray.length).toBe(0);
      expect(merged[0]).toHaveProperty('bData');
      expect(merged[0]).toHaveProperty('aData');
    });
    it('isFullyMerged is false on non matching property', () => {
      const { merged, nonMerged, isFullyMerged } = merge(
        a,
        [{ id: 2, ...b }],
        'id'
      );
      expect(isFullyMerged).toBe(false);
      expect(merged.length).toBe(0);
      expect(nonMerged.aArray.length).toBe(1);
      expect(nonMerged.bArray.length).toBe(1);
    });
    it('isFullyMerged is false on property that does not exist', () => {
      const { merged, nonMerged, isFullyMerged } = merge(a, b, 'bad_id' as any);
      expect(isFullyMerged).toBe(false);
      expect(merged.length).toBe(0);
      expect(nonMerged.aArray.length).toBe(1);
      expect(nonMerged.bArray.length).toBe(1);
    });
    it('isFullyMerged is true when b array is valid but a longer length', () => {
      const { merged, nonMerged, isFullyMerged } = merge(
        a,
        [...b, { id: 1, bData: 10 }],
        'id'
      );
      expect(isFullyMerged).toBe(true);
      expect(merged.length).toBe(1);
      expect(nonMerged.aArray.length).toBe(0);
      expect(nonMerged.bArray.length).toBe(1);
    });
    it('isFullyMerged is false when both arrays empty', () => {
      const { merged, nonMerged, isFullyMerged } = merge([], [], 'id');
      expect(isFullyMerged).toBe(false);
      expect(merged.length).toBe(0);
      expect(nonMerged.aArray.length).toBe(0);
      expect(nonMerged.bArray.length).toBe(0);
    });
    it('isFullyMerged is false when "a" array empty', () => {
      const { merged, nonMerged, isFullyMerged } = merge([], b, 'id');
      expect(isFullyMerged).toBe(false);
      expect(merged.length).toBe(0);
      expect(nonMerged.aArray.length).toBe(0);
      expect(nonMerged.bArray.length).toBe(1);
    });
    it('isFullyMerged is false when "b" array empty', () => {
      const { merged, nonMerged, isFullyMerged } = merge(a, [], 'id');
      expect(isFullyMerged).toBe(false);
      expect(merged.length).toBe(0);
      expect(nonMerged.aArray.length).toBe(1);
      expect(nonMerged.bArray.length).toBe(0);
    });
  });
});
