import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgChartsModule } from 'ng2-charts';

import { AdminDashboardRoutingModule } from './admin-dashboard-routing.module';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { MetricasComponent } from './metricas/metricas.component';
import { SedesComponent } from './sedes/sedes.component';
import { CamasComponent } from './camas/camas.component';
import { PacientesComponent } from './pacientes/pacientes.component';
import { AdmisionesComponent } from './admisiones/admisiones.component';
import { TareasComponent } from './tareas/tareas.component';
import { FacturacionComponent } from './facturacion/facturacion.component';
import { GastosComponent } from './gastos/gastos.component';
import { ConfigComponent } from './config/config.component';
import { EmpleadosComponent } from './empleados/empleados.component';
import { VouchersComponent } from './vouchers/vouchers.component';
import { RecursosComponent } from './recursos/recursos.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    MetricasComponent,
    SedesComponent,
    CamasComponent,
    PacientesComponent,
    AdmisionesComponent,
    TareasComponent,
    FacturacionComponent,
    GastosComponent,
    ConfigComponent,
    EmpleadosComponent,
    VouchersComponent,
    RecursosComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    FormsModule,
    RouterModule,
    DragDropModule,
    NgChartsModule,
    AdminDashboardRoutingModule
  ],
  exports: [
    AdminDashboardComponent,
    MetricasComponent,
    SedesComponent,
    CamasComponent,
    PacientesComponent,
    AdmisionesComponent,
    TareasComponent,
    FacturacionComponent,
    GastosComponent,
    ConfigComponent,
    EmpleadosComponent,
    VouchersComponent,
    RecursosComponent
  ]
})
export class AdminDashboardModule { }
