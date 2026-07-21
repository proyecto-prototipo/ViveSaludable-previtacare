export type AnswerValue = string | string[];
export interface PatientFormInput {
  full_name: string;
  age: number;
  sex: string;
  contact: string;
  district: string;
  consent_accepted: boolean;
}
