import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// USUARIO
import ExencionPasantia from './components/usuario/ExencionPasantia';
import CrearSolicitud from './components/usuario/CrearSolicitud';
import ConsultarSolicitud from './components/usuario/ConsultarSolicitud';

// EMPLEADO
import LogIn from './components/empleado/Login';
import GestorSolicitudes from './components/empleado/GestionSolicitudes';
import RespuestaSolicitud from './components/empleado/ResponderSolicitudes';


import Administracion from './components/empleado/Administracion';
import CrearUsuario from './components/empleado/CrearUsuario';
import EditarUsuario from './components/empleado/EditarUsuario';
import AdminLayout from './layout/Adminloyout';

function App() {
    return (
        <Router>
            <Routes>
                {/* RUTAS DE USUARIO */}
                <Route path="/" element={<ExencionPasantia />} />
                <Route path="/crear-solicitud" element={<CrearSolicitud />} />
                <Route path="/verificar-estatus" element={<ConsultarSolicitud />} />

                {/* RUTAS DE EMPLEADO */}
                <Route path="/empleado" element={<LogIn />} />
                <Route path="/empleado/gestor-solicitudes" element={<GestorSolicitudes rol="empleado" />} />
                <Route path="/empleado/responder/:numeroSolicitud" element={<RespuestaSolicitud />} />


                {/* Ruta de Administrador */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="usuarios" element={<Administracion />} />
                    <Route path="solicitudes" element={<GestorSolicitudes rol="admin" />} />
                    <Route path="responder/:numeroSolicitud" element={<RespuestaSolicitud  />} />
                </Route>
                <Route path="/admin/usuarios/crear" element={<CrearUsuario />} />
                <Route path="/admin/usuario/editar/:id" element={<EditarUsuario /> } />
            </Routes>
        </Router>
    );
}

export default App;