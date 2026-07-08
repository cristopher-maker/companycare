import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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

const routes: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    children: [
      { path: '', redirectTo: 'metricas', pathMatch: 'full' },
      { path: 'metricas', component: MetricasComponent },
      { path: 'sedes', component: SedesComponent },
      { path: 'camas', component: CamasComponent },
      { path: 'pacientes', component: PacientesComponent },
      { path: 'admisiones', component: AdmisionesComponent },
      { path: 'tareas', component: TareasComponent },
      { path: 'facturacion', component: FacturacionComponent },
      { path: 'gastos', component: GastosComponent },
      { path: 'config', component: ConfigComponent },
      { path: 'empleados', component: EmpleadosComponent },
      { path: 'vouchers', component: VouchersComponent },
      { path: 'recursos', component: RecursosComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminDashboardRoutingModule { }
