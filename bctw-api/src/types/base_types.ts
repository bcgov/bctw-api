import { z } from 'zod';

export interface BCTWBaseType {
  created_at?: Date;
  created_by_user_id?: number;
  updated_at?: Date;
  updated_by_user_id?: number;
  valid_from: Date;
  valid_to: Date;
}

export const BCTWBaseTypeSchema = z.object({
  created_at: z.date().optional(),
  created_by_user_id: z.number().optional(),
  updated_at: z.date().optional(),
  updated_by_user_id: z.number().optional(),
  valid_from: z.date(),
  valid_to: z.date(),
});
