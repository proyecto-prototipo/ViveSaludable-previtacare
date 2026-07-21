import type { Question, QuestionOption, RecommendationRule } from '../../shared/types/models';
export type QuestionInput = Partial<Question>;
export type OptionInput = Partial<QuestionOption>;
export type RuleInput = Partial<RecommendationRule>;
