import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type PatientStatus =
  | 'estable'
  | 'mejorando'
  | 'sin_cambios'
  | 'empeorando'
  | 'requiere_atencion'
  | 'alta'
  | 'derivado';

export type FollowupType =
  | 'llamada'
  | 'videollamada'
  | 'chat'
  | 'presencial'
  | 'nota_interna';

export type FollowupPriority = 'baja' | 'media' | 'alta' | 'urgente';

export type PatientFollowup = {
  id: string;
  request_id: string | null;
  expert_id: string;
  employee_id: string;
  patient_status: PatientStatus;
  note: string;
  internal_note: string | null;
  followup_type: FollowupType;
  next_followup_date: string | null;
  priority: FollowupPriority;
  created_at: string;
  updated_at: string;
  expert_name?: string | null;
};

export type FollowupCreatePayload = {
  request_id?: string | null;
  expert_id: string;
  employee_id: string;
  patient_status: PatientStatus;
  note: string;
  internal_note?: string | null;
  followup_type: FollowupType;
  next_followup_date?: string | null;
  priority?: FollowupPriority;
};

export const PATIENT_STATUS_CONFIG: Record<PatientStatus, { label: string; color: string; icon: string }> = {
  estable:            { label: 'Estable y tranquilo/a',   color: '#0088A8', icon: 'check_circle' },
  mejorando:          { label: 'Evolucionando muy bien', color: '#16a34a', icon: 'trending_up' },
  sin_cambios:        { label: 'Estable / Sin novedades',color: '#d97706', icon: 'horizontal_rule' },
  empeorando:         { label: 'Bajo monitoreo cercano', color: '#dc2626', icon: 'trending_down' },
  requiere_atencion:  { label: 'Requiere atención especial', color: '#dc2626', icon: 'warning' },
  alta:               { label: 'En casa / Con el alta',   color: '#16a34a', icon: 'task_alt' },
  derivado:           { label: 'Derivado a especialista', color: '#7c3aed', icon: 'swap_horiz' },
};

export const FOLLOWUP_TYPE_CONFIG: Record<FollowupType, { label: string; icon: string }> = {
  llamada:      { label: 'Llamada',       icon: 'call' },
  videollamada: { label: 'Videollamada',  icon: 'videocam' },
  chat:         { label: 'Chat',          icon: 'chat' },
  presencial:   { label: 'Presencial',    icon: 'person' },
  nota_interna: { label: 'Nota interna',  icon: 'note' },
};

@Injectable({ providedIn: 'root' })
export class FollowupService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Obtiene el ÚLTIMO seguimiento de un empleado (para la tarjeta del Dashboard).
   */
  async getLatestFollowup(employeeId: string): Promise<PatientFollowup | null> {
    const { data, error } = await this.supabase.client
      .from('patient_followups')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('FollowupService.getLatestFollowup:', error);
      return null;
    }

    if (!data) return null;

    // Enriquecer con nombre del experto
    const enriched = data as PatientFollowup;
    if (enriched.expert_id) {
      const { data: profile } = await this.supabase.client
        .from('profiles')
        .select('full_name')
        .eq('id', enriched.expert_id)
        .maybeSingle();
      enriched.expert_name = profile?.full_name ?? null;
    }

    return enriched;
  }

  /**
   * Obtiene el historial completo de seguimientos para un empleado.
   */
  async getFollowupHistory(employeeId: string): Promise<PatientFollowup[]> {
    const { data, error } = await this.supabase.client
      .from('patient_followups')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('FollowupService.getFollowupHistory:', error);
      return [];
    }

    const followups = (data ?? []) as PatientFollowup[];

    // Enriquecer con nombres de expertos
    const expertIds = [...new Set(followups.map(f => f.expert_id).filter(Boolean))];
    if (expertIds.length) {
      const { data: profiles } = await this.supabase.client
        .from('profiles')
        .select('id, full_name')
        .in('id', expertIds);

      const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]));
      followups.forEach(f => {
        f.expert_name = nameMap.get(f.expert_id) ?? null;
      });
    }

    return followups;
  }

  /**
   * Obtiene seguimientos por solicitud (para la vista del Care Expert).
   */
  async getFollowupsByRequest(requestId: string): Promise<PatientFollowup[]> {
    const { data, error } = await this.supabase.client
      .from('patient_followups')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('FollowupService.getFollowupsByRequest:', error);
      return [];
    }

    const followups = (data ?? []) as PatientFollowup[];

    const expertIds = [...new Set(followups.map(f => f.expert_id).filter(Boolean))];
    if (expertIds.length) {
      const { data: profiles } = await this.supabase.client
        .from('profiles')
        .select('id, full_name')
        .in('id', expertIds);

      const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]));
      followups.forEach(f => {
        f.expert_name = nameMap.get(f.expert_id) ?? null;
      });
    }

    return followups;
  }

  /**
   * Obtiene todos los seguimientos de un empleado (para uso del expert).
   */
  async getFollowupsByEmployee(employeeId: string): Promise<PatientFollowup[]> {
    return this.getFollowupHistory(employeeId);
  }

  /**
   * Crea una nueva nota de seguimiento.
   */
  async addFollowup(payload: FollowupCreatePayload): Promise<PatientFollowup | null> {
    const { data, error } = await this.supabase.client
      .from('patient_followups')
      .insert({
        request_id: payload.request_id ?? null,
        expert_id: payload.expert_id,
        employee_id: payload.employee_id,
        patient_status: payload.patient_status,
        note: payload.note,
        internal_note: payload.internal_note ?? null,
        followup_type: payload.followup_type,
        next_followup_date: payload.next_followup_date ?? null,
        priority: payload.priority ?? 'media',
      })
      .select('*')
      .single();

    if (error) {
      console.error('FollowupService.addFollowup:', error);
      throw error;
    }

    return (data as PatientFollowup) ?? null;
  }

  /**
   * Actualiza una nota de seguimiento existente.
   */
  async updateFollowup(id: string, updates: Partial<FollowupCreatePayload>): Promise<void> {
    const { error } = await this.supabase.client
      .from('patient_followups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('FollowupService.updateFollowup:', error);
      throw error;
    }
  }

  /**
   * Obtiene los seguimientos pendientes del experto (próximos a realizarse).
   */
  async getPendingFollowups(expertId: string): Promise<PatientFollowup[]> {
    const { data, error } = await this.supabase.client
      .from('patient_followups')
      .select('*')
      .eq('expert_id', expertId)
      .not('next_followup_date', 'is', null)
      .order('next_followup_date', { ascending: true });

    if (error) {
      console.error('FollowupService.getPendingFollowups:', error);
      return [];
    }

    const followups = (data ?? []) as PatientFollowup[];

    // Enriquecer con nombres de empleados
    const employeeIds = [...new Set(followups.map(f => f.employee_id).filter(Boolean))];
    if (employeeIds.length) {
      const { data: profiles } = await this.supabase.client
        .from('profiles')
        .select('id, full_name')
        .in('id', employeeIds);

      const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]));
      followups.forEach(f => {
        f.expert_name = nameMap.get(f.employee_id) ?? null;
      });
    }

    return followups;
  }
}
