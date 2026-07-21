import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Info,
  ShieldCheck,
  Sparkles,
  TestTube2,
  TrendingUp
} from 'lucide-react';

import { Badge } from '../../../shared/ui/Badge';
import { Card } from '../../../shared/ui/Card';
import { formatCurrency } from '../../../shared/lib/utils';
import type { Recommendation } from '../../../shared/types/models';
import '../styles/recommendation.css';

function getPriorityConfig(priority?: string) {
  const value = priority?.toLowerCase();

  if (value === 'alta') {
    return {
      tone: 'danger' as const,
      label: 'Prioridad alta',
      className: 'priority-high',
      icon: AlertTriangle
    };
  }

  if (value === 'media') {
    return {
      tone: 'warning' as const,
      label: 'Prioridad media',
      className: 'priority-medium',
      icon: TrendingUp
    };
  }

  return {
    tone: 'info' as const,
    label: 'Prioridad baja',
    className: 'priority-low',
    icon: ShieldCheck
  };
}

function getReasons(reasons: unknown) {
  if (Array.isArray(reasons)) return reasons.filter(Boolean);
  if (typeof reasons === 'string' && reasons.trim()) return [reasons];
  return [];
}

export function RecommendationCard({
  item,
  position
}: {
  item: Recommendation;
  position: number;
}) {
  const priority = getPriorityConfig(item.priority_level);
  const PriorityIcon = priority.icon;
  const reasons = getReasons(item.reasons);
  const score = Number(item.priority_score ?? 0);
  const scorePercent = Math.min(Math.max(score * 18, 12), 100);

  return (
    <Card className={`recommendation-card ${priority.className}`}>
      <div className="recommendation-rank">
        <span>#{position}</span>
        <small>Ranking</small>
      </div>

      <div className="recommendation-content">
        <div className="recommendation-top">
          <div className="recommendation-icon-wrap">
            <TestTube2 size={26} />
          </div>

          <div className="recommendation-heading">
            <div className="recommendation-badges">
              <Badge tone={priority.tone}>
                <PriorityIcon size={14} />
                {priority.label}
              </Badge>

              <Badge tone="muted">
                <Sparkles size={14} />
                Puntaje {item.priority_score ?? 0}
              </Badge>
            </div>

            <h2>{item.rapid_tests?.name || 'Prueba recomendada'}</h2>

            <p>
              {item.rapid_tests?.description ||
                'Recomendación generada según las respuestas preventivas del paciente.'}
            </p>
          </div>
        </div>

        <div className="recommendation-score-box">
          <div className="recommendation-score-header">
            <span>Nivel de recomendación</span>
            <strong>{score} pts</strong>
          </div>

          <div className="recommendation-score-track">
            <div
              className="recommendation-score-fill"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        <div className="recommendation-info-grid">
          <div className="recommendation-info-item">
            <ClipboardCheck size={18} />
            <div>
              <span>Tipo de orientación</span>
              <strong>Preventiva</strong>
            </div>
          </div>

          <div className="recommendation-info-item">
            <Info size={18} />
            <div>
              <span>Precio referencial</span>
              <strong>{formatCurrency(item.price_snapshot)}</strong>
            </div>
          </div>
        </div>

        <div className="recommendation-reasons">
          <div className="recommendation-section-title">
            <CheckCircle2 size={18} />
            <span>Motivos de recomendación</span>
          </div>

          {reasons.length ? (
            <ul>
              {reasons.map((reason, index) => (
                <li key={`${reason}-${index}`}>
                  <CheckCircle2 size={16} />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="recommendation-empty-reason">
              Esta recomendación aún no tiene motivos detallados registrados.
            </div>
          )}
        </div>

        <div className="recommendation-ai-note">
          <Sparkles size={17} />
          <span>
            Orientación preventiva generada a partir de respuestas, reglas y criterios configurados.
          </span>
        </div>
      </div>
    </Card>
  );
}

export function WarningBox({ message }: { message: string }) {
  return (
    <div className="warning-box">
      <div className="warning-icon">
        <AlertTriangle size={20} />
      </div>

      <div>
        <strong>Advertencia preventiva</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}