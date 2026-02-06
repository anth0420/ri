import { Outlet, NavLink } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import "../styles/AdminLayout.css";

const AdminLayout = () => {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    // Verificar si el usuario es admin
    const isAdmin = user?.rol?.toLowerCase() === 'admin';

    // Determinar la ruta de solicitudes según el rol
    const solicitudesRoute = isAdmin ? "/admin/solicitudes" : "/empleado/gestor-solicitudes";

    return (
        <div className="layout-container">
            {/* Overlay para móviles */}
            {isSidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={closeSidebar}
                ></div>
            )}

            <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <h3>SISTEMAS</h3>
                    </div>
                    <button
                        className="sidebar-close"
                        onClick={closeSidebar}
                        aria-label="Cerrar menú"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {/* Solo mostrar Gestión de usuarios si es Admin */}
                    {isAdmin && (
                        <NavLink
                            to="/admin/usuarios"
                            className={({ isActive }) =>
                                isActive ? "nav-link active" : "nav-link"
                            }
                            onClick={closeSidebar}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>Gestión de usuarios</span>
                        </NavLink>
                    )}

                    {/* Solicitudes de exención - ruta dinámica según el rol */}
                    <NavLink
                        to={solicitudesRoute}
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                        onClick={closeSidebar}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <span>Solicitudes de exención</span>
                    </NavLink>
                </nav>
            </aside>

            <div className="main-wrapper">
                <Navbar onMenuClick={toggleSidebar} />
                <main className="layout-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;