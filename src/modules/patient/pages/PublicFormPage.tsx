import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { PublicFormLayout } from '../../../shared/layouts/PublicFormLayout';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { LoadingState } from '../../../shared/components/LoadingState';
import type { Question } from '../../../shared/types/models';
import { loadActiveQuestions, loadPublicForm, submitPublicForm } from '../services/patient.service';
import type { AnswerValue, PatientFormInput } from '../types';
import '../styles/patient.css';

const sections = ['datos', 'sintomas', 'habitos', 'antecedentes', 'factores_riesgo'];
const sectionLabels: Record<string,string> = { datos: 'Datos básicos', sintomas: 'Síntomas', habitos: 'Hábitos', antecedentes: 'Antecedentes', factores_riesgo: 'Factores de riesgo' };

export function PublicFormPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [formOk, setFormOk] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState<PatientFormInput>({ full_name: '', age: 18, sex: 'femenino', contact: '', district: '', consent_accepted: false });
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const currentSection = sections[step];
  const currentQuestions = useMemo(()=>questions.filter(q=>q.section===currentSection),[questions,currentSection]);
  const progress = ((step + 1) / sections.length) * 100;

  useEffect(()=>{ Promise.all([loadPublicForm(token), loadActiveQuestions()]).then(([f,q])=>{ setFormOk(Boolean(f)); setQuestions(q); if(f?.patients){ setPatient(p=>({ ...p, full_name: f.patients?.full_name ?? '', age: f.patients?.age ?? 18, sex: f.patients?.sex ?? 'femenino', contact: f.patients?.contact ?? '', district: f.patients?.district ?? '' })); } }).catch(err=>setError(err.message)); },[token]);

  function answer(question: Question, value: string, checked?: boolean) {
    if (question.question_type === 'multiple') {
      const current = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : [];
      setAnswers(prev => ({ ...prev, [question.id]: checked ? [...current, value] : current.filter(v => v !== value) }));
    } else {
      setAnswers(prev => ({ ...prev, [question.id]: value }));
    }
  }

  async function submit() {
    if (!patient.consent_accepted) { setError('Debes aceptar el aviso preventivo y tratamiento de datos.'); return; }
    setSubmitting(true); setError('');
    try {
      await submitPublicForm({ token, patient, answers });
      const form = await loadPublicForm(token);
      navigate(`/resultado/${form?.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo enviar el formulario.'); }
    finally { setSubmitting(false); }
  }

  if (error && !formOk) return <PublicFormLayout><Card className="patient-card"><h1>Formulario no disponible</h1><p className="alert alert-danger">{error}</p></Card></PublicFormLayout>;
  if (!questions.length && !formOk) return <LoadingState />;
  return <PublicFormLayout><Card className="patient-card"><h1>{sectionLabels[currentSection]}</h1><p className="page-subtitle">Completa tus respuestas. La orientación no reemplaza una evaluación médica profesional.</p><div className="progress-wrap"><div className="progress-bar" style={{width:`${progress}%`}} /></div>{error?<div className="alert alert-danger">{error}</div>:null}
    {currentSection==='datos' ? <div className="question-group"><div className="disclaimer-box">ViveSaludable brinda orientación preventiva basada en tus respuestas. No emite diagnósticos médicos ni reemplaza una consulta médica.</div><div className="form-grid"><div className="field"><label>Nombre o código</label><Input value={patient.full_name} onChange={e=>setPatient({...patient,full_name:e.target.value})}/></div><div className="field"><label>Edad</label><Input type="number" value={patient.age} onChange={e=>setPatient({...patient,age:Number(e.target.value)})}/></div><div className="field"><label>Sexo</label><Select value={patient.sex} onChange={e=>setPatient({...patient,sex:e.target.value})}><option>femenino</option><option>masculino</option><option>otro</option></Select></div><div className="field"><label>Contacto</label><Input value={patient.contact} onChange={e=>setPatient({...patient,contact:e.target.value})}/></div><div className="field"><label>Distrito</label><Input value={patient.district} onChange={e=>setPatient({...patient,district:e.target.value})}/></div></div><label className="option-item"><input type="checkbox" checked={patient.consent_accepted} onChange={e=>setPatient({...patient,consent_accepted:e.target.checked})}/> Acepto el uso preventivo de la plataforma y el tratamiento de mis datos para generar recomendaciones personalizadas.</label></div> : null}
    {currentSection!=='datos' ? <div className="question-group">{currentQuestions.map(q=><div className="question-box" key={q.id}><strong>{q.question_text}</strong>{q.question_type==='text'||q.question_type==='number'?<Input type={q.question_type==='number'?'number':'text'} onChange={e=>answer(q,e.target.value)}/>:<div className="option-list">{q.question_options?.map(o=><label className="option-item" key={o.id}><input type={q.question_type==='multiple'?'checkbox':'radio'} name={q.id} onChange={e=>answer(q,o.id,e.currentTarget.checked)}/>{o.label}</label>)}</div>}</div>)}</div> : null}
    <div className="actions" style={{justifyContent:'space-between', marginTop:'1rem'}}><Button variant="light" disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}><ChevronLeft size={16}/> Atrás</Button>{step<sections.length-1?<Button onClick={()=>setStep(s=>s+1)}>Siguiente <ChevronRight size={16}/></Button>:<Button variant="secondary" disabled={submitting} onClick={submit}>{submitting?'Procesando...':<><Send size={17}/> Enviar formulario</>}</Button>}</div>
  </Card></PublicFormLayout>;
}
