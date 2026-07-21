export type Role = 'admin' | 'institutional' | 'patient';
export type AccountStatus = 'active' | 'pending' | 'suspended' | 'inactive';
export type PriorityLevel = 'alta' | 'media' | 'baja';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  client_id: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  client_type: string;
  responsible_name: string;
  email: string;
  phone: string | null;
  district: string | null;
  status: AccountStatus;
  activation_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  client_id: string;
  code: string | null;
  full_name: string | null;
  age: number;
  sex: string;
  contact: string | null;
  district: string | null;
  consent_accepted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RapidTest {
  id: string;
  name: string;
  description: string | null;
  price: number;
  includes_igv: boolean;
  stock: number;
  is_active: boolean;
  is_main_test: boolean;
  is_complementary_product: boolean;
  sample_type: string | null;
  result_time: string | null;
  conditions: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  section: string;
  question_text: string;
  question_type: 'single' | 'multiple' | 'text' | 'number' | 'boolean';
  is_required: boolean;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  question_options?: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  question_id: string;
  label: string;
  value: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

export interface RecommendationRule {
  id: string;
  question_id: string;
  option_id: string | null;
  test_id: string;
  score: number;
  reason_text: string | null;
  triggers_warning: boolean;
  warning_type: string | null;
  warning_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PreventiveForm {
  id: string;
  client_id: string;
  patient_id: string | null;
  completed_by: string | null;
  public_token: string | null;
  status: 'draft' | 'completed';
  consent_accepted: boolean;
  preventive_disclaimer_accepted: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  form_id: string;
  patient_id: string;
  client_id: string;
  test_id: string;
  priority_score: number;
  priority_level: PriorityLevel;
  reasons: string[];
  price_snapshot: number;
  stock_snapshot: number;
  position: number;
  created_at: string;
  rapid_tests?: RapidTest;

  ai_status?: string | null;
  ai_summary?: string | null;
  ai_explanation?: string | null;
  ai_key_points?: string[] | null;
  ai_alerts?: string[] | null;
  ai_disclaimer?: string | null;
  ai_model?: string | null;
  ai_error?: string | null;
  ai_generated_at?: string | null;
}

export interface PreventiveWarning {
  id: string;
  form_id: string;
  patient_id: string;
  client_id: string;
  test_id: string | null;
  warning_type: string;
  message: string;
  created_at: string;
}

export interface PerformedTest {
  id: string;
  patient_id: string;
  client_id: string;
  recommendation_id: string | null;
  test_id: string;
  performed_by: string;
  result_status: string;
  result_value: string | null;
  observation: string | null;
  performed_at: string;
  created_at: string;
  updated_at: string;
  patients?: Patient;
  rapid_tests?: RapidTest;
}
