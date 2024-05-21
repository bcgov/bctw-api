import {
  uuidToColor,
  mergeGeoProperties,
  getGeoJSONCritterIds,
  uuidToInt,
  intToHSL,
} from '../../../src/apis/map_api';
import { ICollectionUnit, ICritter } from '../../../src/types/critter';
import {
  FeatureCollection,
  GeoJSONPropertyCombined,
} from '../../../src/types/map';
import { v4 as uuidv4 } from 'uuid';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const geoData = {
  type: 'FeatureCollection',
  features: [
    {
      id: 1,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [102.0, 0.5],
      },
      properties: {
        critter_id: '1',
      },
    },
    {
      id: 2,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [103.0, 0.4],
      },
      properties: {
        critter_id: '2',
      },
    },
  ],
} as FeatureCollection;

const mockCollectionUnit: ICollectionUnit = {
  category_name: 'DummyCategory',
  unit_name: 'DummyUnit',
  collection_unit_id: 'DummyCollectionUnitId',
  collection_category_id: 'DummyCollectionCategoryId',
};

const critterData: ICritter[] = [
  {
    critter_id: '1',
    wlh_id: '1',
    animal_id: 'DummyAnimalId',
    sex: 'M',
    taxon: 'DummyTaxon',
    collection_units: [mockCollectionUnit],
    mortality_timestamp: null,
  },
];

describe('map_api', () => {
  describe('uuidToColor', () => {
    it('returns valid hexadecimal colors for different UUIDs', () => {
      const uuid1 = uuidv4();
      const color1 = uuidToColor(uuid1);
      expect(color1.fillColor).toMatch(HEX_COLOR_REGEX);
      expect(color1.outlineColor).toMatch(HEX_COLOR_REGEX);

      const uuid2 = uuidv4();
      const color2 = uuidToColor(uuid2);
      expect(color2.fillColor).toMatch(HEX_COLOR_REGEX);
      expect(color2.outlineColor).toMatch(HEX_COLOR_REGEX);
    });
    it('returns different colors for different UUIDs', () => {
      const colors = new Set();
      for (let i = 0; i < 100; i++) {
        const uuid = uuidv4();
        const color = uuidToColor(uuid);
        colors.add(color.fillColor);
      }
      expect(colors.size).toEqual(100);
    });
    it('returns a uniform hue of colors', () => {
      let sumHue = 0;
      const numSamples = 1000;

      for (let i = 0; i < numSamples; i++) {
        const uuid = uuidv4();
        const intVal = uuidToInt(uuid);
        const hslFillColor = intToHSL(intVal);
        sumHue += hslFillColor.h;
      }

      const averageHue = sumHue / numSamples;

      // We expect the average hue to be about 180 (middle of 0-360 range)
      // Given the randomness, we allow some tolerance
      const tolerance = 10;
      expect(averageHue).toBeGreaterThanOrEqual(180 - tolerance);
      expect(averageHue).toBeLessThanOrEqual(180 + tolerance);
    });
    it('returns a uniform saturation of colors', () => {
      let sumSaturation = 0;
      const numSamples = 1000;

      for (let i = 0; i < numSamples; i++) {
        const uuid = uuidv4();
        const intVal = uuidToInt(uuid);
        const hslFillColor = intToHSL(intVal);
        sumSaturation += hslFillColor.s;
        expect(hslFillColor.s).toBeGreaterThanOrEqual(50);
        expect(hslFillColor.s).toBeLessThanOrEqual(100);
      }

      const averageSaturation = sumSaturation / numSamples;

      // We expect the average saturation to be about 75 (middle of 50-100 range)
      const tolerance = 10;
      expect(averageSaturation).toBeGreaterThanOrEqual(75 - tolerance);
      expect(averageSaturation).toBeLessThanOrEqual(75 + tolerance);
    });
    it('returns lightness of colors within the right bounds', () => {
      const numSamples = 1000;

      for (let i = 0; i < numSamples; i++) {
        const uuid = uuidv4();
        const intVal = uuidToInt(uuid);
        const hslFillColor = intToHSL(intVal);

        // Checking the adjustment in lightness for earthy tones
        if (hslFillColor.h >= 20 && hslFillColor.h <= 170) {
          expect(hslFillColor.l).toBeGreaterThanOrEqual(40);
          expect(hslFillColor.l).toBeLessThanOrEqual(90);
        } else {
          expect(hslFillColor.l).toBeGreaterThanOrEqual(20);
          expect(hslFillColor.l).toBeLessThanOrEqual(80);
        }
      }
    });
  });

  describe('mergeGeoProperties', () => {
    it('correctly combines data from geoData and critterData', () => {
      const combinedData = mergeGeoProperties(geoData, critterData);

      expect(
        (combinedData.features[0].properties as GeoJSONPropertyCombined)
          .animal_id
      ).toEqual('DummyAnimalId');
      expect(combinedData.features.length).toEqual(2);
    });
  });

  describe('getGeoJSONCritterIds', () => {
    it('extracts the correct IDs from various valid inputs', () => {
      const features = geoData.features;

      const ids = getGeoJSONCritterIds(features);

      expect(ids).toEqual(['1', '2']);
    });
  });
});
