import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

type LeadStatus = 'nuevo' | 'contactado' | 'evaluacion' | 'match' | 'cerrado' | 'perdido';

@Component({
  selector: 'app-admisiones',
  templateUrl: './admisiones.component.html'
})
export class AdmisionesComponent {
  leadFilters = { query: '', status: 'all', comuna: '' };

  kanbanColumns: { id: LeadStatus; label: string }[] = [
    { id: 'nuevo', label: 'Nuevas Consultas' },
    { id: 'contactado', label: 'Contactado' },
    { id: 'evaluacion', label: 'Evaluación Clínica' },
    { id: 'match', label: 'Propuesta' },
    { id: 'cerrado', label: 'Ingresado / Cerrado' },
    { id: 'perdido', label: 'Perdido' }
  ];

  constructor(public parent: AdminDashboardComponent) {}

  get filteredKanbanColumns() {
    if (this.leadFilters.status === 'all') return this.kanbanColumns;
    return this.kanbanColumns.filter((column) => column.id === this.leadFilters.status);
  }

  get filteredTotalKanbanLeads(): number {
    return this.filteredKanbanColumns.reduce((total, column) => total + this.getFilteredKanbanItems(column.id).length, 0);
  }

  get filteredFinalKanbanLeads(): number {
    return ['cerrado', 'perdido'].reduce((total, status) => total + this.getFilteredKanbanItems(status as LeadStatus).length, 0);
  }

  hasActiveLeadFilters(): boolean {
    return this.leadFilters.query.trim().length > 0 || this.leadFilters.comuna.trim().length > 0 || this.leadFilters.status !== 'all';
  }

  isTerminalKanbanColumn(columnId: LeadStatus): boolean {
    return columnId === 'cerrado' || columnId === 'perdido';
  }

  getKanbanColumnHint(columnId: LeadStatus): string {
    const hints: Record<LeadStatus, string> = {
      nuevo: 'Entrada del pipeline',
      contactado: 'Primer seguimiento',
      evaluacion: 'Validacion clinica',
      match: 'Definicion comercial',
      cerrado: 'Resultado favorable',
      perdido: 'Salida no concretada'
    };
    return hints[columnId];
  }

  getKanbanEmptyTitle(columnId: LeadStatus): string {
    return this.isTerminalKanbanColumn(columnId)
      ? `Sin casos ${columnId === 'cerrado' ? 'cerrados' : 'perdidos'}`
      : `Sin casos en ${this.parent.leadStatusLabel(columnId).toLowerCase()}`;
  }

  getKanbanEmptyHint(columnId: LeadStatus): string {
    if (this.hasActiveLeadFilters()) {
      return 'Prueba con otro texto, comuna o etapa para ampliar el resultado.';
    }
    const hints: Record<LeadStatus, string> = {
      nuevo: 'Las nuevas consultas apareceran aqui.',
      contactado: 'Arrastra una consulta cuando ya exista contacto inicial.',
      evaluacion: 'Mueve aqui los casos que requieran evaluacion clinica.',
      match: 'Usa esta etapa para propuestas o ajuste de oferta.',
      cerrado: 'Los ingresos concretados quedan agrupados aqui.',
      perdido: 'Marca aqui los casos que no avanzaron.'
    };
    return hints[columnId];
  }

  getFilteredKanbanItems(columnId: LeadStatus) {
    const query = this.leadFilters.query.trim().toLowerCase();
    const comuna = this.leadFilters.comuna.trim().toLowerCase();
    return (this.parent.kanbanData[columnId] || []).filter((lead) => {
      const haystack = [
        lead.nombre,
        lead.comuna,
        lead.dependencia
      ].join(' ').toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesComuna = !comuna || String(lead.comuna || '').toLowerCase().includes(comuna);
      return matchesQuery && matchesComuna;
    });
  }

  resetLeadFilters() {
    this.leadFilters = { query: '', status: 'all', comuna: '' };
  }

  async dropKanban(event: CdkDragDrop<any[]>) {
    if (!this.parent.ensureOperationalAccess()) return;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const newStatus = event.container.id as LeadStatus;
      const movedItem = event.item.data;

      const { error } = await this.parent.supabase.client
        .from('leads')
        .update({ estado: newStatus })
        .eq('id', movedItem.id);

      if (error) {
        console.error('Error actualizando el estado del lead:', error);
        this.parent.flash('No se pudo mover el lead. Revisa la consola para más detalles.');
        return;
      }
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      
      if (newStatus === 'cerrado' && event.previousContainer.id !== 'cerrado') {
        if (await this.parent.confirmAction('El prospecto ha sido cerrado con éxito. ¿Deseas ingresarlo como paciente activo y configurar su tarifa mensual ahora?')) {
           this.parent.openNewPacienteFromLead(movedItem);
        }
      }
    }
  }

  trackByKanbanColumn = (_index: number, column: { id: LeadStatus }) => column.id;
  trackByLead = (_index: number, lead: { id?: string | number }) => lead.id ?? _index;
}
