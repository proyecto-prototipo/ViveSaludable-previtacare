export interface ResultInput {
  patient_id: string;
  test_id: string;
  recommendation_id?: string | null;
  result_status: string;
  result_value?: string | null;
  observation?: string | null;
  performed_at: string;
}
