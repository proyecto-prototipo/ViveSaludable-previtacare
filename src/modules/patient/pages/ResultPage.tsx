import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

import { PublicFormLayout } from '../../../shared/layouts/PublicFormLayout';
import { LoadingState } from '../../../shared/components/LoadingState';
import { RecommendationCard, WarningBox } from '../../recommendation/components/RecommendationCard';
import {
  loadPreventiveAIContext,
  loadPreventiveAIResult,
  loadResult,
  markPreventiveAIGenerating,
  savePreventiveAIError,
  savePreventiveAIResult
} from '../../recommendation/services/recommendation.service';
import type { PreventiveWarning, Recommendation, RapidTest } from '../../../shared/types/models';
import { Card } from '../../../shared/ui/Card';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';
import {
  generarRefuerzoPreventivoIA,
  type PreventiveAIResponse
} from '../services/gemini-preventive-ai.service';
import '../styles/patient.css';

type AIStatus = 'pending' | 'generating' | 'completed' | 'failed' | string | null;

export function ResultPage() {
  const { formId = '' } = useParams();

  const aiStartedRef = useRef(false);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [warnings, setWarnings] = useState<PreventiveWarning[]>([]);
  const [complements, setComplements] = useState<RapidTest[]>([]);

  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  const [aiResult, setAiResult] = useState<PreventiveAIResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>('pending');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initResult() {
      setLoading(true);

      try {
        const [resultData, aiState] = await Promise.all([
          loadResult(formId),
          loadPreventiveAIResult(formId)
        ]);

        if (!mounted) return;

        setRecommendations(resultData.recommendations);
        setWarnings(resultData.warnings);
        setComplements(resultData.complements);

        setAiResult((aiState.ai_result as PreventiveAIResponse | null) ?? null);
        setAiStatus(aiState.ai_result_status ?? 'pending');
        setAiError(aiState.ai_result_error ?? null);
        setAiGeneratedAt(aiState.ai_result_generated_at ?? null);

        setLoading(false);

        const alreadyHasAI =
          aiState.ai_result_status === 'completed' && Boolean(aiState.ai_result);

        const isCurrentlyGenerating = aiState.ai_result_status === 'generating';
        const alreadyFailed = aiState.ai_result_status === 'failed';

        const shouldGenerateAI =
          resultData.recommendations.length > 0 &&
          !alreadyHasAI &&
          !isCurrentlyGenerating &&
          !alreadyFailed &&
          !aiStartedRef.current;

        if (!shouldGenerateAI) return;

        aiStartedRef.current = true;
        setAiLoading(true);
        setAiStatus('generating');

        try {
          await markPreventiveAIGenerating(formId);

          const aiPayload = await loadPreventiveAIContext(
            formId,
            resultData.recommendations
          );

          console.log('Payload enviado a Gemini:', aiPayload);

          const generatedAI = await generarRefuerzoPreventivoIA(aiPayload);

          console.log('Respuesta IA preventiva:', generatedAI);

          const savedForm = await savePreventiveAIResult(formId, generatedAI);

          if (!mounted) return;

          setAiResult(generatedAI);
          setAiStatus(savedForm.ai_result_status ?? 'completed');
          setAiError(null);
          setAiGeneratedAt(savedForm.ai_result_generated_at ?? new Date().toISOString());
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'No se pudo generar la respuesta IA.';

          console.error('Error generando refuerzo IA:', error);

          await savePreventiveAIError(formId, message);

          if (!mounted) return;

          setAiStatus('failed');
          setAiError(message);
        } finally {
          if (mounted) setAiLoading(false);
        }
      } catch (error) {
        console.error('No se pudo cargar el resultado:', error);
        if (mounted) setLoading(false);
      }
    }

    if (formId) {
      initResult();
    }

    return () => {
      mounted = false;
    };
  }, [formId]);

  if (loading) return <LoadingState />;

  return (
    <PublicFormLayout>
      <section className="result-hero">
        <h1>Resultado preventivo</h1>
        <p className="page-subtitle">
          Estas recomendaciones se generan según tus respuestas, precios y stock disponible.
        </p>
      </section>

      <div className="result-grid">
        <div className="disclaimer-box">
          Esta recomendación es orientativa y preventiva. No reemplaza una evaluación médica profesional.
        </div>

        {warnings.map(w => (
          <WarningBox key={w.id} message={w.message} />
        ))}

        {recommendations.length ? (
          recommendations.map((r, i) => (
            <RecommendationCard key={r.id} item={r} position={i + 1} />
          ))
        ) : (
          <div className="empty-state">
            <h3>No se generaron recomendaciones principales</h3>
            <p>Puede que no haya suficientes coincidencias o que las pruebas estén sin stock.</p>
          </div>
        )}

        {aiLoading || aiStatus === 'generating' ? (
          <section className="patient-ai-card patient-ai-loading">
            <div className="patient-ai-icon">
              <Sparkles size={24} />
            </div>

            <div>
              <h3>Generando refuerzo preventivo con IA...</h3>
              <p>
                Estamos preparando una explicación más clara y personalizada de tu orientación preventiva.
              </p>
            </div>
          </section>
        ) : null}

        {aiStatus === 'completed' && aiResult ? (
          <section className="patient-ai-card">
            <div className="patient-ai-header">
              <div className="patient-ai-icon">
                <Sparkles size={25} />
              </div>

              <div>
                <span>Refuerzo preventivo con IA</span>
                <h2>{aiResult.estado_ia}</h2>
                {aiGeneratedAt ? (
                  <p>Generado el {formatDate(aiGeneratedAt)}</p>
                ) : null}
              </div>
            </div>

            <div className="patient-ai-summary">
              <CheckCircle2 size={19} />
              <p>{aiResult.resumen_ia}</p>
            </div>

            <div className="patient-ai-section">
              <h3>Observación preventiva</h3>
              <p>{aiResult.observacion_ia}</p>
            </div>

            <div className="patient-ai-section">
              <h3>Recomendación orientativa</h3>
              <p>{aiResult.recomendacion_ia}</p>
            </div>

            {aiResult.pruebas_reforzadas?.length ? (
              <div className="patient-ai-tests">
                <h3>Pruebas reforzadas por IA</h3>

                {aiResult.pruebas_reforzadas.map((test, index) => (
                  <article className="patient-ai-test" key={`${test.nombre_prueba}-${index}`}>
                    <div>
                      <strong>{test.nombre_prueba}</strong>
                      <span>Prioridad IA: {test.nivel_prioridad_ia}</span>
                    </div>

                    <p>{test.motivo_ia}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {aiResult.alertas_preventivas?.length ? (
              <div className="patient-ai-alerts">
                <h3>
                  <AlertTriangle size={18} />
                  Alertas preventivas
                </h3>

                {aiResult.alertas_preventivas.map((alert, index) => (
                  <p key={`${alert}-${index}`}>{alert}</p>
                ))}
              </div>
            ) : null}

            <div className="patient-ai-disclaimer">
              <ShieldCheck size={18} />
              <span>
                {aiResult.disclaimer_ia ||
                  'Esta orientación es preventiva y no reemplaza una evaluación médica profesional.'}
              </span>
            </div>
          </section>
        ) : null}

        {aiStatus === 'failed' && aiError ? (
          <section className="patient-ai-card patient-ai-error">
            <div className="patient-ai-icon">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3>No se pudo generar el refuerzo IA</h3>
              <p>{aiError}</p>
              <span>
                Tus recomendaciones preventivas principales siguen siendo válidas porque fueron generadas por reglas del sistema.
              </span>
            </div>
          </section>
        ) : null}

        {complements.length
          ? complements.map(product => (
              <Card key={product.id}>
                <h3>Sugerencia complementaria informativa</h3>
                <p>
                  <strong>{product.name}</strong> puede mostrarse como orientación posterior,
                  pero no forma parte del ranking principal de pruebas.
                </p>
                <strong>{formatCurrency(product.price)}</strong>
              </Card>
            ))
          : null}
      </div>
    </PublicFormLayout>
  );
}