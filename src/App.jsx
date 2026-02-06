import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';

// USUARIO
import ExencionPasantia from './components/usuario/ExencionPasantia';
import CrearSolicitud from './components/usuario/CrearSolicitud';
import ConsultarSolicitud from './components/usuario/ConsultarSolicitud';

// EMPLEADO
import LogIn from './components/empleado/Login';
import GestorSolicitudes from './components/empleado/GestionSolicitudes';
import RespuestaSolicitud from './components/empleado/ResponderSolicitudes';

// ADMIN
import Administracion from './components/empleado/Administracion';
import CrearUsuario from './components/empleado/CrearUsuario';
import EditarUsuario from './components/empleado/EditarUsuario';
import AdminLayout from './layout/Adminloyout';

function App() {
    return (
        <Router>
            <Routes>
                {/* RUTAS PÚBLICAS */}
                <Route path="/" element={<ExencionPasantia />} />
                <Route path="/crear-solicitud" element={<CrearSolicitud />} />
                <Route path="/verificar-estatus" element={<ConsultarSolicitud />} />
                <Route path="/login" element={<LogIn />} />


                {/* ADMIN */}
                <Route
                    path="/empleado"
                    element={
                        <ProtectedRoute allowedRoles={["Validador","Lector"]}>
                            <AdminLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="gestor-solicitudes" element={<GestorSolicitudes />} />
                    <Route path="responder/:numeroSolicitud" element={
                        <ProtectedRoute allowedRoles={["Validador"]}>
                            <RespuestaSolicitud />
                        </ProtectedRoute>
                    } />
                </Route>


                {/* ADMIN */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <AdminLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="usuarios" element={<Administracion />} />
                    <Route path="solicitudes" element={<GestorSolicitudes />} />
                    <Route path="responder/:numeroSolicitud" element={<RespuestaSolicitud />} />
                </Route>



                <Route
                    path="/admin/usuarios/crear"
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <CrearUsuario />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/usuario/editar/:id"
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <EditarUsuario />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;
