import { Outlet, NavLink } from "react-router-dom";

import "../styles/AdminLayout.css";

const AdminLayout = () => {
    return (
        <div className="layout-container">
            <aside className="sidebar">
 
                <nav className="sidebar-nav">
                    <NavLink
                        to="/admin/usuarios"
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                    >
                        Gestión de usuarios
                    </NavLink>

                    <NavLink
                        to="/admin/solicitudes"
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                    >
                        Solicitudes de exención de pasantías
                    </NavLink>
                </nav>
            </aside>

            <main className="layout-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;