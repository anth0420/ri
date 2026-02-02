import React, { useState, useEffect, useMemo } from 'react';
import logo from '../../assets/logo.png';
import '../../styles/Administracion.css';
import { useNavigate } from "react-router-dom";
import CrearUsuario from './CrearUsuario';

const API_URL = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 15;
const PAGES_PER_BLOCK = 10;

const Administrador = () => {
    /* ===============================
       ESTADO
    =============================== */
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [rolFiltro, setRolFiltro] = useState('');

    const [sortConfig, setSortConfig] = useState({
        key: 'nombre',
        direction: 'asc'
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [usuarioConfirmacion, setUsuarioConfirmacion] = useState(null);
    const [mostrarCrearUsuario, setMostrarCrearUsuario] = useState(false);

    const navigate = useNavigate();

    /* ===============================
       CARGA DE DATOS
    =============================== */
    const fetchUsuarios = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/Usuarios`);
            if (!response.ok) throw new Error();
            const data = await response.json();
            setUsuarios(data.data ?? data);
        } catch (error) {
            console.error(error);
            alert('Error al cargar los usuarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsuarios();
    }, []);

    /* ===============================
       FECHA
    =============================== */
    const formatearFechaConHora = (fecha) => {
        if (!fecha) return '—';
        const date = new Date(fecha);
        if (isNaN(date)) return '—';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    /* ===============================
       FILTRO, BÚSQUEDA Y ORDEN
    =============================== */
    const usuariosFiltrados = useMemo(() => {
        let data = [...usuarios];

        // Búsqueda
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(u =>
                u.nombre?.toLowerCase().includes(term) ||
                u.correo?.toLowerCase().includes(term)
            );
        }

        // Filtro por rol
        if (rolFiltro) {
            data = data.filter(u => u.rol === rolFiltro);
        }

        // Ordenamiento
        data.sort((a, b) => {
            let aVal, bVal;

            switch (sortConfig.key) {
                case 'nombre':
                    aVal = a.nombre?.toLowerCase() || '';
                    bVal = b.nombre?.toLowerCase() || '';
                    break;
                case 'correo':
                    aVal = a.correo?.toLowerCase() || '';
                    bVal = b.correo?.toLowerCase() || '';
                    break;
                case 'rol':
                    aVal = a.rol?.toLowerCase() || '';
                    bVal = b.rol?.toLowerCase() || '';
                    break;
                case 'ultimoAcceso':
                    aVal = new Date(a.ultimoAcceso || 0);
                    bVal = new Date(b.ultimoAcceso || 0);
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [usuarios, searchTerm, rolFiltro, sortConfig]);

    /* ===============================
       PAGINACIÓN
    =============================== */
    const totalPages = Math.ceil(usuariosFiltrados.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const usuariosPaginados = usuariosFiltrados.slice(startIndex, endIndex);

    const currentBlock = Math.floor((currentPage - 1) / PAGES_PER_BLOCK);
    const startPage = currentBlock * PAGES_PER_BLOCK + 1;
    const endPage = Math.min(startPage + PAGES_PER_BLOCK - 1, totalPages);

    const visiblePages = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, rolFiltro, sortConfig]);

    /* ===============================
       ORDENAMIENTO
    =============================== */
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) return <span className="sort-icon inactive">↕</span>;
        return sortConfig.direction === 'asc'
            ? <span className="sort-icon active">↑</span>
            : <span className="sort-icon active">↓</span>;
    };

    /* ===============================
       ACCIONES
    =============================== */
    const cambiarEstadoUsuario = async (usuario) => {
        if (!usuario) return;

        try {
            await fetch(`${API_URL}/api/Usuarios/${usuario.id}/estado`, {
                method: 'PUT'
            });
            fetchUsuarios();
        } catch (error) {
            console.error(error);
            alert('Error al cambiar el estado');
        }
    };

    /* ===============================
       UI
    =============================== */
    return (
        <div className="gestor-wrapper">
            <div className="gestor-card">
                <div className="gestor-header">
                    <img src={logo} alt="Registro Inmobiliario" className="gestor-logo" />
                </div>

                <h1 className="gestor-title">Módulo de gestión de usuarios</h1>

                {/* Contador y botón */}
                <div className="admin-header-section">
                    <div className="usuarios-count">Usuarios configurados</div>
                    <button
                        className="btn-primary"
                        onClick={() => setMostrarCrearUsuario(true)}
                    >
                        Agregar usuario
                    </button>
                </div>

                {/* Filtros de búsqueda */}
                <div className="gestor-search">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o correo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />

                    <select
                        value={rolFiltro}
                        onChange={(e) => setRolFiltro(e.target.value)}
                        className="search-select"
                    >
                        <option value="">Todos los roles</option>
                        <option value="Validador">Validador</option>
                        <option value="Lector">Lector</option>
                    </select>
                </div>

                {loading ? (
                    <div className="gestor-loading">Cargando usuarios...</div>
                ) : (
                    <>
                        <div className="gestor-table-wrapper">
                            <table className="gestor-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('nombre')}>
                                            Nombre {getSortIcon('nombre')}
                                        </th>
                                        <th onClick={() => handleSort('correo')}>
                                            Correo {getSortIcon('correo')}
                                        </th>
                                        <th onClick={() => handleSort('rol')}>
                                            Rol {getSortIcon('rol')}
                                        </th>
                                        <th>Estado</th>
                                        <th onClick={() => handleSort('ultimoAcceso')}>
                                            Último acceso {getSortIcon('ultimoAcceso')}
                                        </th>
                                        <th className="no-sort">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuariosPaginados.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="gestor-empty">
                                                No hay usuarios
                                            </td>
                                        </tr>
                                    ) : (
                                        usuariosPaginados.map((u, ) => (
                                            <tr key={u.id}>
                                                <td>{u.nombre}</td>
                                                <td>{u.correo}</td>
                                                <td>{u.rol}</td>
                                                <td>
                                                    <div className="toggle-container">
                                                        <label className="toggle-switch">
                                                            <input
                                                                type="checkbox"
                                                                checked={u.activo}
                                                                onChange={() => setUsuarioConfirmacion(u)}
                                                            />
                                                            <span className="toggle-slider"></span>
                                                        </label>
                                                        <span className="toggle-label">
                                                            {u.activo ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{formatearFechaConHora(u.ultimoAcceso)}</td>
                                                <td className="action-cell">
                                                    <button
                                                        className="btn-icon-edit"
                                                        onClick={() => navigate(`/admin/usuarios/editar/${u.id}`)}
                                                        title="Editar usuario"
                                                    >
                                                        ✎
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINACIÓN */}
                        {totalPages > 1 && (
                            <div className="gestor-pagination">
                                {currentBlock > 0 && (
                                    <button
                                        className="page-nav"
                                        onClick={() => setCurrentPage(startPage - 1)}
                                    >
                                        «
                                    </button>
                                )}

                                {visiblePages.map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`page-number ${currentPage === page ? 'active' : ''}`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                {endPage < totalPages && (
                                    <button
                                        className="page-nav"
                                        onClick={() => setCurrentPage(endPage + 1)}
                                    >
                                        »
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* MODAL CONFIRMACIÓN */}
                {usuarioConfirmacion && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <p>
                                ¿Está seguro de que desea
                                <strong>
                                    {usuarioConfirmacion.activo ? ' inactivar ' : ' activar '}
                                </strong>
                                al usuario <strong>{usuarioConfirmacion.nombre}</strong>?
                            </p>

                            <div className="modal-actions">
                                <button onClick={() => setUsuarioConfirmacion(null)}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn-danger"
                                    onClick={() => {
                                        cambiarEstadoUsuario(usuarioConfirmacion);
                                        setUsuarioConfirmacion(null);
                                    }}
                                >
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL CREAR USUARIO */}
                {mostrarCrearUsuario && (
                    <CrearUsuario
                        onClose={() => setMostrarCrearUsuario(false)}
                        onSuccess={() => {
                            setMostrarCrearUsuario(false);
                            fetchUsuarios();
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default Administrador;